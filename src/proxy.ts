/**
 * proxy.ts — Updated untuk NextAuth v5
 *
 * Menggunakan auth() dari NextAuth v5 untuk cek sesi,
 * menggantikan pengecekan cookie manual sebelumnya.
 *
 * ✅ Next.js 16 — file bernama proxy.ts, export function proxy
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/tryout", "/dashboard", "/checkout", "/riwayat"];
const AUTH_ONLY_ROUTES   = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ NextAuth v5 — auth() bisa dipanggil di proxy
  const session = await auth();
  const isLoggedIn = !!session?.user;

  // Sudah login → jangan tampilkan halaman auth
  if (isLoggedIn && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // Belum login → redirect ke login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cek kepemilikan volume
  const tryoutMatch = pathname.match(/^\/tryout\/(\d+)/);
  if (tryoutMatch) {
    const volumeId = parseInt(tryoutMatch[1], 10);

    // Production: cek dari DB via session.user.id
    // const owned = await getUserOwnedVolumes(session.user.id);
    // if (!owned.includes(volumeId)) {
    //   return NextResponse.redirect(new URL(`/checkout/${volumeId}`, request.url));
    // }

    // Fallback cookie untuk mock
    const purchased = request.cookies.get("asn_purchased")?.value ?? "";
    const ids = purchased.split(",").map(Number).filter(Boolean);
    if (!ids.includes(volumeId)) {
      return NextResponse.redirect(
        new URL(`/checkout/${volumeId}`, request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};