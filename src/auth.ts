/**
 * auth.ts — Konfigurasi Tunggal NextAuth v5 (Terpusat & Optimized)
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users } from "@/db/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const AUTH_ROUTES = {
  signIn: "/login",
  error: "/login",
  newUser: "/dashboard",
} as const;

const AUTH_ERRORS = {
  notVerified: "email_not_verified",
  invalidCredentials: "invalid_credentials",
} as const;

const DEFAULT_ROLES = {
  admin: "ADMIN",
  user: "USER",
} as const;

// ==========================================
// NEXTAUTH CONFIG
// ==========================================
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },

  pages: {
    signIn: AUTH_ROUTES.signIn,
    error: AUTH_ROUTES.error,
    newUser: AUTH_ROUTES.newUser, 
  },

  providers: [
    // ── 1. GOOGLE OAUTH PROVIDER ──
    Google({
      // Auth.js v5 secara otomatis mendeteksi AUTH_GOOGLE_ID & AUTH_GOOGLE_SECRET dari .env,
      // tapi mendefinisikannya secara eksplisit tetap aman sebagai dokumentasi.
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── 2. EMAIL & PASSWORD CREDENTIALS PROVIDER ──
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // OPTIMASI: Hanya ambil kolom yang benar-benar dibutuhkan untuk login
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            passwordHash: true,
            emailVerified: true,
          }
        });

        if (!user?.passwordHash) return null;

        if (!user.emailVerified) {
          throw new Error(AUTH_ERRORS.notVerified);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) throw new Error(AUTH_ERRORS.invalidCredentials);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role || DEFAULT_ROLES.user, // Pastikan selalu ada role
        };
      },
    }),
  ],

  callbacks: {
    // ── JWT CALLBACK (Sangat Berpengaruh pada Performa) ──
    async jwt({ token, user, trigger, session }) {
      // 1. Saat pertama kali login, objek `user` tersedia.
      // Kita tanamkan data ke dalam token di sini agar tersimpan di cookies (stateless).
      if (user) {
        token.userId = user.id;
        token.role = user.role;
      }

      // 2. Jika ada pembaruan sesi secara manual dari client (misal: user di-upgrade ke admin)
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      // 3. FALLBACK: Hanya hit database JIKA token.role tidak ada (sangat jarang terjadi).
      // Menghindari query DB pada setiap request halaman!
      if (token.userId && !token.role) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.userId as string),
          columns: { role: true }, // OPTIMASI: Hanya ambil kolom 'role', hemat memori & bandwidth
        });
        token.role = dbUser?.role || DEFAULT_ROLES.user;
      }

      return token;
    },

    // ── SESSION CALLBACK ──
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
        session.user.role = (token.role as "ADMIN" | "USER") || DEFAULT_ROLES.user;
      }
      return session;
    },

    async authorized({ auth }) {
      return !!auth;
    },
  },

  events: {
    async createUser({ user }) {
      // Menggunakan logger produksi jika ada, fallback ke console.log
      console.info(`[Auth] Registrasi baru berhasil: ${user.email} (Provider: Google)`);
    },
  },

  // Matikan debug di production agar log tidak bocor
  debug: process.env.NODE_ENV === "development",
});