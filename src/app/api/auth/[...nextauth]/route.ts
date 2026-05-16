/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * ✅ NextAuth v5 — satu baris, handlers dari auth.ts
 * Melayani semua route:
 *   GET  /api/auth/signin
 *   GET  /api/auth/callback/google
 *   POST /api/auth/signin/credentials
 *   POST /api/auth/signout
 *   GET  /api/auth/session
 *   dll
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;