"use server";

/**
 * lib/actions/auth.ts
 *
 * ✅ Server Actions — berjalan 100% di server, tidak pernah ke client
 * ✅ "use server" di top file = semua fungsi di file ini adalah Server Actions
 *
 * Di production: ganti mock dengan Prisma/Drizzle + bcrypt + set cookie session
 *
 * 📦 INSTALL:
 *   npm install bcryptjs
 *   npm install -D @types/bcryptjs
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Tipe return yang konsisten — null = sukses, object = error
type ActionResult = { error: string } | null;

// ─────────────────────────────────────────
// LOGIN ACTION
// ─────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email");
  const password = formData.get("password");

  // Validasi input server-side — jangan percaya validasi HTML saja
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "invalid_email" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { error: "invalid_credentials" };
  }

  // ── Production: ganti blok ini ──
  // const user = await prisma.user.findUnique({ where: { email } });
  // if (!user) return { error: "user_not_found" };
  // const valid = await bcrypt.compare(password, user.passwordHash);
  // if (!valid) return { error: "invalid_credentials" };

  // Mock: email apapun dengan password >= 8 karakter dianggap login berhasil
  const isMockValid = email.length > 0 && password.length >= 8;
  if (!isMockValid) return { error: "invalid_credentials" };

  // ── Set session cookie ──
  const cookieStore = await cookies();
  cookieStore.set("asn_session", "mock-session-token", {
    httpOnly: true,   // tidak bisa diakses JavaScript — aman dari XSS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });

  // Mock: set volume 1 & 2 sebagai sudah dibeli
  cookieStore.set("asn_purchased", "1,2", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return null; // null = sukses, client yang handle redirect
}

// ─────────────────────────────────────────
// REGISTER ACTION
// ─────────────────────────────────────────
export async function registerAction(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");

  // Validasi server-side
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "invalid_name" };
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "invalid_email" };
  }
  if (typeof password !== "string" || password.length < 8) {
    return { error: "weak_password" };
  }

  // ── Production: ganti blok ini ──
  // const existing = await prisma.user.findUnique({ where: { email } });
  // if (existing) return { error: "email_taken" };
  // const hash = await bcrypt.hash(password, 12);
  // const user = await prisma.user.create({
  //   data: { name: name.trim(), email, passwordHash: hash }
  // });

  // Mock: simulasi email sudah terdaftar
  if (email === "test@asnpedia.com") return { error: "email_taken" };

  // Set session setelah register — auto login
  const cookieStore = await cookies();
  cookieStore.set("asn_session", "mock-session-token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // User baru dapat vol 1 & 2 gratis
  cookieStore.set("asn_purchased", "1,2", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return null;
}

// ─────────────────────────────────────────
// LOGOUT ACTION
// ─────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("asn_session");
  cookieStore.delete("asn_purchased");
  redirect("/login");
}