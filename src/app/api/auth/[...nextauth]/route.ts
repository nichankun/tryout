/**
 * app/api/auth/[...nextauth]/route.ts
 * 
 * Sesuai spesifikasi resmi NextAuth v5 (Auth.js):
 * Handler catch-all endpoint API untuk menangani seluruh alur manajemen sesi otentikasi
 * (signin, signout, session checks, dan OAuth callbacks).
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;