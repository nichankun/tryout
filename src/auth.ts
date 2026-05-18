/**
 * auth.ts — Konfigurasi Tunggal NextAuth v5 (Terpusat)
 * * Menggabungkan Google OAuth & Credentials dengan proteksi hashing bcrypt
 * serta validasi status verifikasi email.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users } from "@/db/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",
    // ✅ FIX: Pengguna baru lewat Google akan dialihkan ke halaman login/onboarding terlebih dahulu
    newUser: "/dashboard", 
  },

  providers: [
    // ── 1. GOOGLE OAUTH PROVIDER ──────────────────────────────────────────
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── 2. EMAIL & PASSWORD CREDENTIALS PROVIDER ──────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",      type: "email"    },
        password: { label: "Kata Sandi", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email    = credentials.email as string;
        const password = credentials.password as string;

        // Ambil data user dari database Neon via Drizzle
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // Jika user tidak ditemukan, atau jika user mendaftar pakai Google (tidak punya passwordHash)
        if (!user?.passwordHash) return null;

        // ✅ FIX: Kunci login jika akun manual belum melakukan verifikasi link email
        if (!user.emailVerified) {
          throw new Error("email_not_verified");
        }

        // Validasi kecocokan password dengan bcrypt
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          image: user.image,
          role:  user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      // Ambil data role segar langsung dari database Neon via Drizzle
      if (token.userId) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.userId as string),
        });

        if (dbUser) {
          token.role = (dbUser as any).role || "USER";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.role) session.user.role = token.role as "ADMIN" | "USER";
      return session;
    },

    async authorized({ auth }) {
      return !!auth;
    },
  },

  events: {
    async createUser({ user }) {
      console.log("[Auth] Registrasi berhasil via Google:", user.email);
    },
  },

  debug: process.env.NODE_ENV === "development",
});