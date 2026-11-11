"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authServer } from "@/auth";
import { appUrl } from "@/lib/app-url";
import { db } from "@/db";
import {
  authAccounts,
  authSessions,
  passwordResetTokens,
  users,
} from "@/db/database/schema";

const LoginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
  callbackUrl: z.string().optional(),
});

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().optional(),
}).refine(
  ({ password, confirmPassword }) => !confirmPassword || password === confirmPassword,
  { path: ["confirmPassword"], message: "Kata sandi dan konfirmasi tidak cocok." },
);

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

const ResetPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase().optional(),
  token: z.string().min(16).max(512),
  password: z.string().min(8).max(128),
});

type ActionError = { error: string };
type LoginResult = ActionError | { role: "ADMIN" | "USER" };

function getSafeCallbackUrl(value: string | undefined) {
  if (!value) return "/dashboard";

  try {
    const base = new URL(appUrl);
    const candidate = new URL(value, base);
    if (candidate.origin !== base.origin) return "/dashboard";
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return "/dashboard";
  }
}

function getErrorText(error: unknown) {
  if (error instanceof APIError) {
    return `${error.status} ${error.message}`.toLowerCase();
  }
  if (error instanceof Error) return error.message.toLowerCase();

  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;
    const body = typeof value.body === "object" && value.body !== null
      ? value.body as Record<string, unknown>
      : undefined;
    return [value.message, value.status, body?.code, body?.message]
      .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
      .join(" ")
      .toLowerCase();
  }

  return "";
}

function mapAuthError(error: unknown): ActionError {
  const detail = getErrorText(error);
  if (detail.includes("email_not_verified") || detail.includes("email not verified")) {
    return { error: "email_not_verified" };
  }
  if (detail.includes("too_many") || detail.includes("too many") || detail.includes("429")) {
    return { error: "too_many_attempts" };
  }
  if (detail.includes("temporarily unavailable") || detail.includes("500")) {
    return { error: "temporarily_unavailable" };
  }
  if (detail.includes("invalid token") || detail.includes("token expired")) {
    return { error: detail.includes("expired") ? "token_expired" : "invalid_token" };
  }
  return { error: "something_went_wrong" };
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid_credentials" };

  try {
    const result = await authServer.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: getSafeCallbackUrl(parsed.data.callbackUrl),
        rememberMe: true,
      },
      headers: await headers(),
    });

    // Migrate a valid legacy bcrypt password to Better Auth's scrypt hash at
    // the first successful login. A failed opportunistic upgrade never blocks login.
    try {
      const legacyHash = await db.query.authAccounts.findFirst({
        where: and(
          eq(authAccounts.userId, result.user.id),
          eq(authAccounts.providerId, "credential"),
        ),
        columns: { id: true, password: true },
      });

      if (legacyHash?.password && /^\$2[aby]\$/.test(legacyHash.password)) {
        const upgradedHash = await hashPassword(parsed.data.password);
        const now = new Date();
        await db.transaction(async (tx) => {
          await tx
            .update(authAccounts)
            .set({ password: upgradedHash, updatedAt: now })
            .where(and(
              eq(authAccounts.id, legacyHash.id),
              eq(authAccounts.password, legacyHash.password!),
            ));
          await tx
            .update(users)
            .set({ passwordHash: null, updatedAt: now })
            .where(eq(users.id, result.user.id));
        });
      }
    } catch {
      console.error("[auth] Legacy password upgrade failed after a successful sign-in.");
    }

    return { role: result.user.role === "ADMIN" ? "ADMIN" : "USER" };
  } catch (error) {
    // Use one public response for unknown email, wrong password and unverified email.
    const mapped = mapAuthError(error);
    return mapped.error === "something_went_wrong"
      ? { error: "invalid_credentials" }
      : mapped;
  }
}

export async function registerAction(formData: FormData): Promise<ActionError | null> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid_fields" };

  try {
    await authServer.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: new URL("/verify-email?status=verified", appUrl).toString(),
      },
      headers: await headers(),
    });
    return null;
  } catch (error) {
    const detail = getErrorText(error);
    if (detail.includes("user_already_exists") || detail.includes("user already exists")) {
      // Same response as an accepted registration; never disclose whether an
      // address already has an account.
      return null;
    }
    return mapAuthError(error);
  }
}

export async function forgotPasswordAction(formData: FormData): Promise<ActionError | null> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid_fields" };

  try {
    await authServer.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: new URL("/reset-password", appUrl).toString(),
      },
      headers: await headers(),
    });
    // Better Auth deliberately returns the same public response for known and
    // unknown accounts, preventing email enumeration.
    return null;
  } catch (error) {
    return mapAuthError(error);
  }
}

export async function resetPasswordAction(formData: FormData): Promise<ActionError | null> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid_fields" };

  try {
    await authServer.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
      headers: await headers(),
    });
    return null;
  } catch (error) {
    // Keep one-hour password reset links issued by the old system usable during
    // deployment. Lock and consume each legacy token atomically to prevent reuse.
    if (!parsed.data.email) return mapAuthError(error);

    try {
      const legacyResult = await db.transaction(async (tx) => {
        const [resetToken] = await tx
          .select({ expires: passwordResetTokens.expires })
          .from(passwordResetTokens)
          .where(and(
            eq(passwordResetTokens.identifier, parsed.data.email!),
            eq(passwordResetTokens.token, parsed.data.token),
          ))
          .for("update");

        if (!resetToken) return "invalid" as const;
        if (resetToken.expires.getTime() <= Date.now()) {
          await tx.delete(passwordResetTokens).where(and(
            eq(passwordResetTokens.identifier, parsed.data.email!),
            eq(passwordResetTokens.token, parsed.data.token),
          ));
          return "expired" as const;
        }

        const [user] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, parsed.data.email!))
          .for("update");
        if (!user) return "invalid" as const;

        const credentialAccount = await tx.query.authAccounts.findFirst({
          where: and(
            eq(authAccounts.userId, user.id),
            eq(authAccounts.providerId, "credential"),
          ),
          columns: { id: true },
        });
        if (!credentialAccount) return "invalid" as const;

        const now = new Date();
        const [password, legacyPassword] = await Promise.all([
          hashPassword(parsed.data.password),
          bcrypt.hash(parsed.data.password, 12),
        ]);

        await tx
          .update(authAccounts)
          .set({ password, updatedAt: now })
          .where(eq(authAccounts.id, credentialAccount.id));
        await tx
          .update(users)
          .set({ passwordHash: legacyPassword, updatedAt: now })
          .where(eq(users.id, user.id));
        await tx.delete(authSessions).where(eq(authSessions.userId, user.id));
        await tx.delete(passwordResetTokens).where(and(
          eq(passwordResetTokens.identifier, parsed.data.email!),
          eq(passwordResetTokens.token, parsed.data.token),
        ));

        return "success" as const;
      });

      if (legacyResult === "success") return null;
      return { error: legacyResult === "expired" ? "token_expired" : "invalid_token" };
    } catch {
      console.error("[auth] Legacy password reset failed.");
      return { error: "temporarily_unavailable" };
    }
  }
}

export async function logoutAction() {
  await authServer.api.signOut({ headers: await headers() });
  redirect("/login");
}
