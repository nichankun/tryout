/**
 * proxy.ts 
 * 
 * Sesuai dokumentasi Next.js 16:
 * Menggunakan auth() dari NextAuth v5 untuk cek sesi,
 * memproteksi rute, menangani pengalihan role (Admin/User), 
 * dan memvalidasi akses tryout.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const ROUTES = {
  login: "/login",
  admin: "/admin",
  dashboard: "/dashboard",
  checkoutPrefix: "/checkout",
} as const;

const ROUTE_GROUPS = {
  protected: ["/tryout", "/dashboard", "/checkout", "/riwayat", "/admin"],
  authOnly: ["/login", "/register"],
} as const;

const ROLES = {
  admin: "ADMIN",
} as const;

const COOKIES = {
  purchasedMock: "asn_purchased",
} as const;

// ==========================================
// PROXY UTAMA
// ==========================================
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth();
  const isLoggedIn = !!session?.user;

  // 1. Arahkan pengguna ke tempat yang benar setelah login
  const isAuthRoute = ROUTE_GROUPS.authOnly.some((route) => pathname.startsWith(route));
  if (isLoggedIn && isAuthRoute) {
    // Jika yang login adalah Admin, arahkan ke /admin. Jika User biasa, ke /dashboard
    const destination = session.user.role === ROLES.admin ? ROUTES.admin : ROUTES.dashboard;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 2. Periksa apakah rute saat ini membutuhkan login (dilindungi)
  const isProtected = ROUTE_GROUPS.protected.some((route) => pathname.startsWith(route));
  if (!isProtected) return NextResponse.next();

  // 3. Belum login tapi mencoba akses rute dilindungi → redirect ke login
  if (!isLoggedIn) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Cek kepemilikan volume (Logika Tryout)
  const tryoutRegex = /^\/tryout\/(\d+)/;
  const tryoutMatch = pathname.match(tryoutRegex);
  
  if (tryoutMatch) {
    const volumeId = parseInt(tryoutMatch[1], 10);

    // Fallback cookie untuk mock
    const purchasedCookie = request.cookies.get(COOKIES.purchasedMock)?.value ?? "";
    const purchasedIds = purchasedCookie.split(",").map(Number).filter(Boolean);
    
    if (!purchasedIds.includes(volumeId)) {
      return NextResponse.redirect(
        new URL(`${ROUTES.checkoutPrefix}/${volumeId}`, request.url)
      );
    }
  }

  // 5. Lolos semua pemeriksaan, izinkan permintaan diteruskan
  return NextResponse.next();
}

// ==========================================
// KONFIGURASI MATCHER NEXT.JS
// ==========================================
export const config = {
  matcher: [
    /*
     * Cocokkan semua rute request kecuali untuk:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - file ekstensi gambar, font, atau css
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};