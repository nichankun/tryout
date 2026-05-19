/**
 * proxy.ts
 *
 * Sesuai dokumentasi Next.js 16:
 * Dioptimalkan untuk performa tinggi (Edge Ready). Sesi (auth) hanya 
 * dipanggil jika rute membutuhkan pengecekan, mengurangi beban 
 * pada rute publik. Validasi kepemilikan volume tryout dilakukan di page level.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==========================================
// KONSTANTA & KONFIGURASI 
// (Tersentralisasi agar mudah dikelola, tanpa hardcode inline)
// ==========================================
const APP_ROUTES = {
  login: "/login",
  admin: "/admin",
  dashboard: "/dashboard",
} as const;

const ROUTE_GROUPS = {
  // Tambahan lupa-password & reset-password berdasarkan struktur folder Anda
  authOnly: ["/login", "/register", "/lupa-password", "/reset-password"],
  protected: ["/tryout", "/dashboard", "/checkout", "/riwayat", "/admin"],
} as const;

const ROLES = {
  admin: "ADMIN",
} as const;

// Helper function untuk pencocokan rute yang lebih efisien dan deklaratif
const checkRouteMatch = (pathname: string, routes: readonly string[]) =>
  routes.some((route) => pathname.startsWith(route));

// ==========================================
// PROXY UTAMA
// ==========================================
export async function proxy(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // 1. Cek tipe rute SEBELUM memanggil auth() untuk menghemat resource
    const isAuthRoute = checkRouteMatch(pathname, ROUTE_GROUPS.authOnly);
    const isProtectedRoute = checkRouteMatch(pathname, ROUTE_GROUPS.protected);

    // 2. Jika rute sepenuhnya publik, langsung loloskan. 
    // Mencegah pemanggilan auth() yang berat pada halaman seperti landing page.
    if (!isAuthRoute && !isProtectedRoute) {
      return NextResponse.next();
    }

    // 3. Ambil sesi (hanya tereksekusi jika rute terkait membutuhkan auth)
    const session = await auth();
    const isLoggedIn = !!session?.user;

    // 4. Arahkan pengguna yang sudah login menjauhi rute autentikasi (login/register)
    if (isLoggedIn && isAuthRoute) {
      const destination =
        session.user?.role === ROLES.admin ? APP_ROUTES.admin : APP_ROUTES.dashboard;
      return NextResponse.redirect(new URL(destination, request.url));
    }

    // 5. Belum login tapi mencoba akses rute dilindungi → redirect ke login
    if (!isLoggedIn && isProtectedRoute) {
      const loginUrl = new URL(APP_ROUTES.login, request.url);
      
      // Amankan parameter callbackUrl agar tidak mengekspos domain penuh (hindari open redirect)
      loginUrl.searchParams.set("callbackUrl", pathname);
      
      return NextResponse.redirect(loginUrl);
    }

    // 6. ✅ Validasi kepemilikan volume tryout diletakkan di app/tryout/[id]/page.tsx
    // Lolos semua pemeriksaan proxy, izinkan permintaan diteruskan
    return NextResponse.next();

  } catch (error) {
    // Penanganan error global agar aplikasi tidak crash jika NextAuth bermasalah
    console.error("[PROXY_ERROR]", error);
    // Jika terjadi error pada sisi auth, kita izinkan lewat, biarkan layout/page yang melempar error
    return NextResponse.next(); 
  }
}

// ==========================================
// KONFIGURASI MATCHER NEXT.JS
// ==========================================
export const config = {
  matcher: [
    /*
     * Cocokkan semua rute request kecuali untuk:
     * - api (API routes biasanya di-handle terpisah oleh Route Handlers)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - file ekstensi gambar, font, atau css
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};