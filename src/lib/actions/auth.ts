"use server";

/**
 * lib/actions/auth.ts — Production Version (Ultra-Optimized)
 * Dioptimalkan dengan Zod Validation, Drizzle Atomic Transactions, 
 * Token Garbage Collection, dan Partial Queries.
 */

import { signIn } from "@/auth"; 
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users, verificationTokens, passwordResetTokens } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { z } from "zod";

// ==========================================
// KONFIGURASI INTERNAL & SCHEMAS
// ==========================================
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const AUTH_CONFIG = {
  bcryptSaltRounds: 12,
  tokenExpiryMs: 3600000, // 1 jam
} as const;

const EMAIL_CONFIG = {
  sender: "ASNPedia <no-reply@asnpedia.bapendasultra.my.id>",
  subjects: {
    verify: "Verifikasi Akun ASNPedia Anda",
    reset: "Atur Ulang Kata Sandi ASNPedia Anda",
  },
} as const;

const AUTH_ERRORS = {
  invalid_credentials: "invalid_credentials",
  email_not_verified: "email_not_verified",
  email_taken: "email_taken",
  invalid_fields: "invalid_fields",
  invalid_token: "invalid_token",
  token_expired: "token_expired",
  something_went_wrong: "something_went_wrong",
} as const;

type ActionResult = { error: string } | null;

// ── ZOD SCHEMAS (Validasi Server-Side yang Kuat) ──
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  name: z.string().min(2).trim(),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

const ResetPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
  token: z.string().uuid(), // Token harus berupa UUID valid
  password: z.string().min(8),
});

// ==========================================
// HELPER: TEMPLATE EMAIL REUSABLE
// ==========================================
function generateEmailLayout(title: string, body: string, actionText: string, actionLink: string, description?: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0f172a;">${title}</h2>
      <p style="color: #475569; line-height: 1.6;">${body}</p>
      <a href="${actionLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">${actionText}</a>
      ${description ? `<p style="color: #475569; line-height: 1.6;">${description}</p>` : ""}
      <p style="color: #94a3b8; font-size: 12px;">Tautan ini aman dan hanya berlaku selama 1 jam.</p>
    </div>
  `;
}

// ─────────────────────────────────────────
// 1. LOGIN ACTION
// ─────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: AUTH_ERRORS.invalid_credentials };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.cause?.err?.message === AUTH_ERRORS.email_not_verified) {
        return { error: AUTH_ERRORS.email_not_verified };
      }
      switch (error.type) {
        case "CredentialsSignin":
          return { error: AUTH_ERRORS.invalid_credentials };
        default:
          return { error: AUTH_ERRORS.something_went_wrong };
      }
    }
    throw error; // Wajib di-throw agar Next.js bisa memproses redirect (jika ada)
  }
}

// ─────────────────────────────────────────
// 2. REGISTER ACTION
// ─────────────────────────────────────────
export async function registerAction(formData: FormData): Promise<ActionResult> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: AUTH_ERRORS.invalid_fields };

  const { name, email, password } = parsed.data;

  try {
    // OPTIMASI: Partial Query, hanya mengambil ID
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true } 
    });

    if (existingUser) return { error: AUTH_ERRORS.email_taken };

    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.bcryptSaltRounds);
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + AUTH_CONFIG.tokenExpiryMs);

    // OPTIMASI: Transaksi Atomic. Insert User & Hapus Token Lama & Insert Token Baru
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        name,
        email,
        passwordHash: hashedPassword,
      });

      // GARBAGE COLLECTION: Hapus token verifikasi lama jika user mencoba register ulang dengan email sama
      await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

      await tx.insert(verificationTokens).values({
        identifier: email,
        token,
        expires,
      });
    });

    // Jalankan email async (tidak nge-block proses database)
    const verificationLink = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: email,
      subject: EMAIL_CONFIG.subjects.verify,
      html: generateEmailLayout(
        `Halo ${name}, Terima kasih telah mendaftar!`,
        "Langkah terakhir, silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda agar bisa mengakses Dashboard ASNPedia:",
        "Verifikasi Email",
        verificationLink
      ),
    });

    return null;
  } catch (error) {
    console.error("[Register Action Error]:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}

// ─────────────────────────────────────────
// 3. FORGOT PASSWORD ACTION
// ─────────────────────────────────────────
export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: AUTH_ERRORS.invalid_fields };

  const { email } = parsed.data;

  try {
    // OPTIMASI: Partial Query, hanya butuh passwordHash untuk tahu ini akun credentials atau OAuth
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { passwordHash: true }
    });

    if (!user || !user.passwordHash) return null; // Keamanan Anti-Enumeration

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + AUTH_CONFIG.tokenExpiryMs);

    // GARBAGE COLLECTION: Hapus token reset lama agar tidak menumpuk di DB
    await db.transaction(async (tx) => {
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.identifier, email));
      await tx.insert(passwordResetTokens).values({
        identifier: email,
        token,
        expires,
      });
    });

    const resetLink = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: email,
      subject: EMAIL_CONFIG.subjects.reset,
      html: generateEmailLayout(
        "Permintaan Atur Ulang Kata Sandi",
        "Kami menerima permintaan untuk mengatur ulang kata sandi akun ASNPedia Anda. Silakan klik tombol di bawah ini untuk melanjutkan:",
        "Atur Ulang Kata Sandi",
        resetLink,
        "Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini."
      ),
    });

    return null;
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}

// ─────────────────────────────────────────
// 4. RESET PASSWORD ACTION
// ─────────────────────────────────────────
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: AUTH_ERRORS.invalid_fields };

  const { email, token, password } = parsed.data;

  try {
    // 1. Validasi kecocokan token
    const existingToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.identifier, email),
        eq(passwordResetTokens.token, token)
      ),
      columns: { expires: true }
    });

    if (!existingToken) return { error: AUTH_ERRORS.invalid_token };

    // 2. Periksa expiry
    if (new Date(existingToken.expires) < new Date()) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return { error: AUTH_ERRORS.token_expired };
    }

    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.bcryptSaltRounds);

    // 3. OPTIMASI: Atomic Transaction (Ganti Password sekaligus buang Token)
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.email, email));

      await tx.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));
    });

    return null;
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}