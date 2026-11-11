import "server-only";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  authAccounts,
  authRateLimits,
  authSessions,
  authVerifications,
  users,
} from "@/db/database/schema";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";

const appUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const secret = process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();

if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("BETTER_AUTH_SECRET must be configured in production.");
}

if (secret && Buffer.byteLength(secret, "utf8") < 32) {
  throw new Error("Better Auth secret must contain at least 32 bytes.");
}

const baseOrigin = new URL(appUrl).origin;
const trustedOrigins = [baseOrigin];
if (process.env.NODE_ENV !== "production") {
  trustedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const emailSender = process.env.RESEND_FROM_EMAIL;
const supportEmail = process.env.SUPPORT_EMAIL?.trim();

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function scheduleAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  after(async () => {
    if (!resend || !emailSender) {
      console.error("[auth-email] Delivery is not configured.");
      return;
    }

    const safeTitle = escapeHtml(input.title);
    const safeMessage = escapeHtml(input.message);
    const action = input.actionUrl && input.actionLabel
      ? `<p style="margin:28px 0"><a href="${escapeHtml(input.actionUrl)}" style="background:#5946d2;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(input.actionLabel)}</a></p>`
      : "";

    try {
      const result = await resend.emails.send({
        from: emailSender,
        ...(supportEmail ? { replyTo: supportEmail } : {}),
        to: input.to,
        subject: input.subject,
        text: `${input.title}\n\n${input.message}${input.actionUrl ? `\n\n${input.actionUrl}` : ""}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;padding:28px;border:1px solid #e8e4f5;border-radius:18px;color:#24163a"><h1 style="font-size:22px">${safeTitle}</h1><p style="line-height:1.65;color:#665d75">${safeMessage}</p>${action}<p style="font-size:12px;color:#8b8497">Jika kamu tidak meminta pesan ini, abaikan email ini.</p></div>`,
      });

      if (result.error) {
        console.error("[auth-email] Provider rejected an authentication email.");
      }
    } catch {
      // Never log message URLs or recipient data: reset/verification URLs contain one-time tokens.
      console.error("[auth-email] Authentication email delivery failed.");
    }
  });
}

const accountRateRules: Record<
  string,
  { limit: number; windowMs: number }
> = {
  "/sign-in/email": { limit: 10, windowMs: 15 * 60 * 1000 },
  "/sign-up/email": { limit: 3, windowMs: 60 * 60 * 1000 },
  "/request-password-reset": { limit: 3, windowMs: 60 * 60 * 1000 },
  "/send-verification-email": { limit: 3, windowMs: 60 * 60 * 1000 },
  "/reset-password": { limit: 10, windowMs: 60 * 60 * 1000 },
};

const betterAuthInstance = betterAuth({
  appName: "ASNPedia",
  baseURL: appUrl,
  secret,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
      rateLimit: authRateLimits,
    },
    transaction: true,
  }),
  advanced: {
    database: { generateId: () => randomUUID() },
    ipAddress: {
      ipAddressHeaders: process.env.AUTH_CLIENT_IP_HEADER
        ? [process.env.AUTH_CLIENT_IP_HEADER]
        : [],
    },
    cookiePrefix: "asnpedia",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 12,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => {
        if (/^\$2[aby]\$/.test(hash)) {
          try {
            return await bcrypt.compare(password, hash);
          } catch {
            return false;
          }
        }

        return verifyPassword({ hash, password });
      },
    },
    onExistingUserSignUp: async ({ user }) => {
      scheduleAuthEmail({
        to: user.email,
        subject: "Percobaan pendaftaran ASNPedia",
        title: "Ada percobaan pendaftaran dengan emailmu",
        message: "Jika ini bukan kamu, tidak ada tindakan yang perlu dilakukan. Akunmu tetap aman.",
      });
    },
    sendResetPassword: async ({ user, url }) => {
      scheduleAuthEmail({
        to: user.email,
        subject: "Atur ulang kata sandi ASNPedia",
        title: "Permintaan atur ulang kata sandi",
        message: "Gunakan tautan satu kali ini dalam 1 jam untuk membuat kata sandi baru.",
        actionLabel: "Atur ulang kata sandi",
        actionUrl: url,
      });
    },
    onPasswordReset: async ({ user }) => {
      scheduleAuthEmail({
        to: user.email,
        subject: "Kata sandi ASNPedia berhasil diubah",
        title: "Kata sandi berhasil diubah",
        message: "Kata sandi akunmu baru saja diatur ulang. Semua sesi aktif lainnya sudah dikeluarkan. Jika ini bukan kamu, segera hubungi bantuan pelanggan.",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 60 * 60,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      scheduleAuthEmail({
        to: user.email,
        subject: "Verifikasi email ASNPedia",
        title: `Halo ${user.name}, verifikasi emailmu`,
        message: "Konfirmasi alamat email untuk mengaktifkan akun ASNPedia. Tautan ini berlaku selama 1 jam.",
        actionLabel: "Verifikasi email",
        actionUrl: url,
      });
    },
  },
  socialProviders: process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? {
        google: {
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
          requireEmailVerification: true,
        },
      }
    : {},
  account: {
    accountLinking: {
      trustedProviders: ["google"],
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 10,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 6 },
      "/request-password-reset": { window: 60 * 60, max: 6 },
      "/send-verification-email": { window: 60 * 60, max: 6 },
      "/reset-password": { window: 60 * 60, max: 10 },
      "/sign-in/social": { window: 15 * 60, max: 20 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const rule = accountRateRules[ctx.path];
      if (!rule) return;

      const body = ctx.body as { email?: unknown; token?: unknown } | undefined;
      const identifier = typeof body?.email === "string"
        ? body.email
        : typeof body?.token === "string" ? body.token : null;
      if (!identifier) return;

      const result = await consumeAccountRateLimit({
        namespace: `better-auth:${ctx.path}`,
        headers: ctx.headers ?? new Headers(),
        identifier,
        limit: rule.limit,
        windowMs: rule.windowMs,
      });

      if (result.storageUnavailable) {
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: "Authentication is temporarily unavailable.",
        });
      }

      if (!result.allowed) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many attempts. Try again later.",
        });
      }
    }),
  },
  plugins: [
    // Required for Next.js Server Actions that sign in or sign out.
    nextCookies(),
  ],
  telemetry: { enabled: false },
});

export const authServer = betterAuthInstance;

/** Server-side session reader used by pages, actions, route handlers and proxy. */
export async function auth() {
  return betterAuthInstance.api.getSession({ headers: await headers() });
}
