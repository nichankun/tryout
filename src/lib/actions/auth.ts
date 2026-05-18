"use server";

/**
 * lib/actions/auth.ts — Production Version (Optimized & Clean)
 */

import { signIn } from "@/auth"; 
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users, verificationTokens, passwordResetTokens } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

// ==========================================
// KONFIGURASI INTERNAL (Tidak Boleh Diekspor)
// ==========================================
const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const AUTH_CONFIG = {
  bcryptSaltRounds: 12,
  tokenExpiryMs: 3600000, // 1 jam masa berlaku token
  minPasswordLength: 8,
  minNameLength: 2,
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
  invalid_name: "invalid_name",
  invalid_email: "invalid_email",
  weak_password: "weak_password",
  email_taken: "email_taken",
  invalid_fields: "invalid_fields",
  invalid_token: "invalid_token",
  token_expired: "token_expired",
  something_went_wrong: "something_went_wrong",
} as const;

type ActionResult = { error: string } | null;

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
      <p style="color: #94a3b8; font-size: 12px;">Tautan ini aman dan hanya berlaku selama 1 hour.</p>
    </div>
  `;
}

// ─────────────────────────────────────────
// 1. LOGIN ACTION
// ─────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !email.includes("@") || !password) {
    return { error: AUTH_ERRORS.invalid_credentials };
  }

  try {
    // Memanggil NextAuth untuk memproses validasi di auth.ts
    await signIn("credentials", {
      email,
      password,
      redirect: false, // Handle redirect secara aman di sisi client (via proxy.ts)
    });
    
    return null; // Sukses, tidak ada error
  } catch (error) {
    if (error instanceof AuthError) {
      // Tangkap custom error dari auth.ts jika email belum diverifikasi
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
    throw error;
  }
}

// ─────────────────────────────────────────
// 2. REGISTER ACTION
// ─────────────────────────────────────────
export async function registerAction(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validasi input server-side menggunakan konfigurasi tersentralisasi
  if (!name || name.trim().length < AUTH_CONFIG.minNameLength) return { error: AUTH_ERRORS.invalid_name };
  if (!email || !email.includes("@")) return { error: AUTH_ERRORS.invalid_email };
  if (!password || password.length < AUTH_CONFIG.minPasswordLength) return { error: AUTH_ERRORS.weak_password };

  try {
    // 1. Cek apakah email sudah terdaftar di database via Drizzle
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { error: AUTH_ERRORS.email_taken };
    }

    // 2. Hash password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.bcryptSaltRounds);

    // 3. Simpan user baru (kolom emailVerified otomatis null/belum aktif)
    await db.insert(users).values({
      name: name.trim(),
      email: email,
      passwordHash: hashedPassword,
    });

    // 4. Generate token verifikasi unik (UUID v4)
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + AUTH_CONFIG.tokenExpiryMs);

    // 5. Simpan token ke tabel verificationToken
    await db.insert(verificationTokens).values({
      identifier: email,
      token: token,
      expires: expires,
    });

    // 6. Kirim email verifikasi menggunakan Resend secara aman (URL encoded)
    const verificationLink = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: email,
      subject: EMAIL_CONFIG.subjects.verify,
      html: generateEmailLayout(
        `Halo ${name.trim()}, Terima kasih telah mendaftar!`,
        "Langkah terakhir, silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda agar bisa mengakses Dashboard ASNPedia:",
        "Verifikasi Email",
        verificationLink
      ),
    });

    return null; // Sukses
  } catch (error) {
    console.error("[Server Action] Error register:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}

// ─────────────────────────────────────────
// 3. FORGOT PASSWORD ACTION
// ─────────────────────────────────────────
export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) return { error: AUTH_ERRORS.invalid_email };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Keamanan: Jika user tidak ada atau daftar via Google, return null (pura-pura sukses)
    // agar pihak luar tidak bisa mendeteksi email siapa saja yang terdaftar di sistem.
    if (!user || !user.passwordHash) return null;

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + AUTH_CONFIG.tokenExpiryMs);

    await db.insert(passwordResetTokens).values({
      identifier: email,
      token: token,
      expires: expires,
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
    console.error("[Server Action] Error forgot password:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}

// ─────────────────────────────────────────
// 4. RESET PASSWORD ACTION
// ─────────────────────────────────────────
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!email || !token || !password || password.length < AUTH_CONFIG.minPasswordLength) {
    return { error: AUTH_ERRORS.invalid_fields };
  }

  try {
    // 1. Validasi kecocokan token dan email di database
    const existingToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.identifier, email),
        eq(passwordResetTokens.token, token)
      ),
    });

    if (!existingToken) return { error: AUTH_ERRORS.invalid_token };

    // 2. Periksa apakah token sudah kedaluwarsa
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return { error: AUTH_ERRORS.token_expired };
    }

    // 3. Hash kata sandi baru menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.bcryptSaltRounds);

    // 4. Update data kata sandi user di database
    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.email, email));

    // 5. Hapus token reset yang sudah sukses digunakan
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return null;
  } catch (error) {
    console.error("[Server Action] Error reset password:", error);
    return { error: AUTH_ERRORS.something_went_wrong };
  }
}