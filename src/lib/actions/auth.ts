"use server";

import { cookies } from "next/headers";
// import { db } from "@/lib/db";
// import { users } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
// import bcrypt from "bcryptjs";

// ✅ Extract constant — tidak hardcode di dua tempat
const SESSION_COOKIE_NAME = "SESSION_COOKIE";
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 hari
  path: "/",
};

// ✅ Validasi email helper — sama polanya dengan client-side
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Server Action: Login Pengguna
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  // ✅ Validasi input
  if (!email || !password) {
    return { error: "EMAIL_PASSWORD_REQUIRED" };
  }
  if (!isValidEmail(email)) {
    return { error: "INVALID_EMAIL" };
  }

  try {
    // ── 1. CARI USER DI DATABASE ──
    // const user = await db.query.users.findFirst({
    //   where: eq(users.email, email),
    // });
    // if (!user) return { error: "INVALID_CREDENTIALS" };

    // ── 2. VERIFIKASI KATA SANDI ──
    // const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    // if (!isPasswordValid) return { error: "INVALID_CREDENTIALS" };

    // PLACEHOLDER — hapus setelah database dihubungkan
    if (email !== "peserta@asnpedia.com" || password !== "password123") {
      return { error: "INVALID_CREDENTIALS" };
    }

    // ── 3. SET SESSION COOKIE ──
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "token-sesi-dummy-skd-2026", SESSION_COOKIE_OPTIONS);

    return { error: null };
  } catch (err) {
    console.error("[loginAction]", err);
    return { error: "SERVER_ERROR" };
  }
}

/**
 * Server Action: Registrasi Pengguna Baru
 */
export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  // ✅ Validasi input — termasuk email yang sebelumnya tidak dicek
  if (!name || !email || !password) {
    return { error: "ALL_FIELDS_REQUIRED" };
  }
  if (name.length < 2) {
    return { error: "NAME_TOO_SHORT" };
  }
  if (!isValidEmail(email)) {
    return { error: "INVALID_EMAIL" };
  }
  if (password.length < 8) {
    return { error: "PASSWORD_TOO_SHORT" };
  }

  try {
    // ── 1. CEK EMAIL SUDAH TERDAFTAR ──
    // const existingUser = await db.query.users.findFirst({
    //   where: eq(users.email, email),
    // });
    // if (existingUser) return { error: "EMAIL_TAKEN" };

    // ── 2. HASH KATA SANDI ──
    // const hashedPassword = await bcrypt.hash(password, 10);

    // ── 3. SIMPAN USER BARU ──
    // await db.insert(users).values({ name, email, passwordHash: hashedPassword });

    // ── 4. OTOMATIS LOGIN SETELAH DAFTAR ──
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "token-sesi-dummy-skd-2026", SESSION_COOKIE_OPTIONS);

    return { error: null };
  } catch (err) {
    console.error("[registerAction]", err);
    return { error: "SERVER_ERROR" };
  }
}