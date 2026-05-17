"use server";

/**
 * lib/actions/auth.ts — Production Version (Full)
 * * ✅ Terintegrasi dengan NextAuth v5 (signIn)
 * ✅ Menggunakan Drizzle ORM untuk cek & simpan user ke Neon Database
 * ✅ Menggunakan Resend SDK untuk mengirim token link verifikasi email & reset password
 */

import { signIn } from "@/auth"; 
import { AuthError } from "next-auth";
import { db } from "@/db";
// ✅ Ditambahkan passwordResetTokens ke dalam import skema
import { users, verificationTokens, passwordResetTokens } from "@/db/database/schema";
// ✅ Ditambahkan 'and' dari drizzle-orm untuk validasi token ganda
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

// Inisialisasi Resend (Pastikan RESEND_API_KEY sudah ada di .env)
const resend = new Resend(process.env.RESEND_API_KEY);

type ActionResult = { error: string } | null;

// ─────────────────────────────────────────
// 1. LOGIN ACTION
// ─────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !email.includes("@") || !password) {
    return { error: "invalid_credentials" };
  }

  try {
    // Memanggil NextAuth untuk memproses validasi di auth.ts
    await signIn("credentials", {
      email,
      password,
      redirect: false, // Handle redirect secara aman di sisi client
    });
    
    return null; // Sukses, tidak ada error
  } catch (error) {
    if (error instanceof AuthError) {
      // Tangkap custom error dari auth.ts jika email belum diverifikasi
      if (error.cause?.err?.message === "email_not_verified") {
        return { error: "email_not_verified" };
      }

      switch (error.type) {
        case "CredentialsSignin":
          return { error: "invalid_credentials" };
        default:
          return { error: "something_went_wrong" };
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

  // Validasi input server-side
  if (!name || name.trim().length < 2) return { error: "invalid_name" };
  if (!email || !email.includes("@")) return { error: "invalid_email" };
  if (!password || password.length < 8) return { error: "weak_password" };

  try {
    // 1. Cek apakah email sudah terdaftar di database via Drizzle
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { error: "email_taken" };
    }

    // 2. Hash password menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Simpan user baru (kolom emailVerified otomatis null/belum aktif)
    await db.insert(users).values({
      name: name.trim(),
      email: email,
      passwordHash: hashedPassword,
    });

    // 4. Generate token verifikasi unik (UUID v4)
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000); // Masa berlaku token: 1 jam

    // 5. Simpan token ke tabel verificationToken
    await db.insert(verificationTokens).values({
      identifier: email,
      token: token,
      expires: expires,
    });

    // 6. Kirim email verifikasi menggunakan Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationLink = `${appUrl}/verify-email?token=${token}&email=${email}`;

    await resend.emails.send({
      from: "ASNPedia <no-reply@asnpedia.bapendasultra.my.id>",
      to: email,
      subject: "Verifikasi Akun ASNPedia Anda",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Halo ${name.trim()}, Terima kasih telah mendaftar!</h2>
          <p style="color: #475569; line-height: 1.6;">Langkah terakhir, silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda agar bisa mengakses Dashboard ASNPedia:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Verifikasi Email</a>
          <p style="color: #94a3b8; font-size: 12px;">Tautan ini aman dan hanya berlaku selama 1 jam.</p>
        </div>
      `,
    });

    return null; // Sukses (client tinggal menampilkan info "Silakan Cek Email Anda")
  } catch (error) {
    console.error("Error register:", error);
    return { error: "something_went_wrong" };
  }
}

// ─────────────────────────────────────────
// 3. FORGOT PASSWORD ACTION
// ─────────────────────────────────────────
export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) return { error: "invalid_email" };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Keamanan: Jika user tidak ada atau daftar via Google, return null (pura-pura sukses)
    // agar pihak luar tidak bisa mendeteksi email siapa saja yang terdaftar di sistem.
    if (!user || !user.passwordHash) return null;

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000); // Berlaku 1 jam

    await db.insert(passwordResetTokens).values({
      identifier: email,
      token: token,
      expires: expires,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${token}&email=${email}`;

    await resend.emails.send({
      from: "ASNPedia <no-reply@asnpedia.bapendasultra.my.id>",
      to: email,
      subject: "Atur Ulang Kata Sandi ASNPedia Anda",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a;">Permintaan Atur Ulang Kata Sandi</h2>
          <p style="color: #475569; line-height: 1.6;">Kami menerima permintaan untuk mengatur ulang kata sandi akun ASNPedia Anda. Silakan klik tombol di bawah ini untuk melanjutkan:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Atur Ulang Kata Sandi</a>
          <p style="color: #475569; line-height: 1.6;">Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.</p>
          <p style="color: #94a3b8; font-size: 12px;">Tautan ini hanya berlaku selama 1 jam.</p>
        </div>
      `,
    });

    return null;
  } catch (error) {
    console.error("Error forgot password:", error);
    return { error: "something_went_wrong" };
  }
}

// ─────────────────────────────────────────
// 4. RESET PASSWORD ACTION
// ─────────────────────────────────────────
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!email || !token || !password || password.length < 8) {
    return { error: "invalid_fields" };
  }

  try {
    // 1. Validasi kecocokan token dan email di database
    const existingToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.identifier, email),
        eq(passwordResetTokens.token, token)
      ),
    });

    if (!existingToken) return { error: "invalid_token" };

    // 2. Periksa apakah token sudah kedaluwarsa
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
      return { error: "token_expired" };
    }

    // 3. Hash kata sandi baru menggunakan bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Update data kata sandi user di database
    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.email, email));

    // 5. Hapus token reset yang sudah sukses digunakan
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return null;
  } catch (error) {
    console.error("Error reset password:", error);
    return { error: "something_went_wrong" };
  }
}