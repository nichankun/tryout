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
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
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

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.passwordHash) return null;

        if (!user.emailVerified) {
          throw new Error(AUTH_ERRORS.notVerified);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      if (token.userId) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.userId as string),
        });

        if (dbUser) {
          // Fallback ke default 'USER' jika role tidak di-set di DB
          token.role = (dbUser as any).role || DEFAULT_ROLES.user;
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
      console.log(`[Auth] Registrasi berhasil via Google: ${user.email}`);
    },
  },

  debug: process.env.NODE_ENV === "development",
});