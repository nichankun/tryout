/**
 * auth.ts  (root project, sejajar dengan app/)
 *
 * ✅ NextAuth v5 (Auth.js) — API baru, bukan v4
 *
 * 📦 INSTALL:
 *   npm install next-auth@beta
 *   npm install @auth/drizzle-adapter drizzle-orm
 *
 * ENV yang dibutuhkan di .env.local:
 *   AUTH_SECRET=random-string-32-chars (generate: npx auth secret)
 *   AUTH_GOOGLE_ID=xxxx.apps.googleusercontent.com
 *   AUTH_GOOGLE_SECRET=xxxx
 *   DATABASE_URL=postgresql://...
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
// import { users } from "@/db/database/schema";
// import { eq } from "drizzle-orm";
// import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Adapter: simpan session & user ke DB via Drizzle ──
  adapter: DrizzleAdapter(db),

  // ── Session strategy: JWT lebih ringan dari database session ──
  session: { strategy: "jwt" },

  // ── Halaman custom ──
  pages: {
    signIn:  "/login",
    error:   "/login", // error param diteruskan ke ?error=...
    newUser: "/dashboard",
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────
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

    // ── Email & Password ──────────────────────────────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",       type: "email"    },
        password: { label: "Kata Sandi",  type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email    = credentials.email as string;
        const password = credentials.password as string;

        // Production: uncomment ini
        // const user = await db.query.users.findFirst({
        //   where: eq(users.email, email),
        // });
        // if (!user?.passwordHash) return null;
        // const valid = await bcrypt.compare(password, user.passwordHash);
        // if (!valid) return null;
        // return { id: user.id, name: user.name, email: user.email };

        // Mock — hapus saat production
        if (email.includes("@") && password.length >= 8) {
          return {
            id:    "mock-user-id",
            name:  "User Mock",
            email,
          };
        }

        return null; // null = login gagal → error: "CredentialsSignin"
      },
    }),
  ],

  callbacks: {
    // ── JWT: tambah userId ke token ──────────────────────────────────────
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },

    // ── Session: expose userId ke client via session ──────────────────────
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },

    // ── Authorized: dipakai oleh proxy.ts untuk cek sesi ─────────────────
    // Dipanggil saat menggunakan auth() di proxy.ts
    async authorized({ auth }) {
      return !!auth; // true = ada session, false = redirect ke /login
    },
  },

  // ── Events: untuk side effects setelah aksi auth ──────────────────────
  events: {
    async createUser({ user }) {
      // Beri akses gratis vol 1 & 2 untuk user baru
      // Production: uncomment ini
      // await db.insert(userAccess).values([
      //   { userId: user.id!, packageId: 1 },
      //   { userId: user.id!, packageId: 2 },
      // ]);
      console.log("[Auth] User baru dibuat:", user.email);
    },
  },

  // ── Debug: aktifkan hanya di development ──────────────────────────────
  debug: process.env.NODE_ENV === "development",
});