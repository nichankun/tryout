/**
 * proxy.ts  (root project, sejajar dengan app/)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const SESSION_COOKIE = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";

// Cookie berisi comma-separated volume ID yang sudah dibeli user (Contoh value: "1,2,5")
const PURCHASED_COOKIE = "asn_purchased";

// ── Route yang butuh login ──
const PROTECTED_PREFIXES = ["/tryout", "/dashboard", "/checkout", "/riwayat"];

// ── Route yang redirect ke dashboard kalau sudah login ──
const AUTH_ONLY_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = Boolean(session);

  // ── 1. Sudah login → jangan tampilkan halaman auth ──
  if (isLoggedIn && AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ── 2. Cek apakah route perlu proteksi ──
  const isProtected = PROTECTED_PREFIXES.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // ── 3. Belum login → redirect ke halaman login ──
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Cek kepemilikan volume (/tryout/[id] atau /tryout/[id]/hasil) ──
  const tryoutMatch = pathname.match(/^\/tryout\/(\d+)/);
  if (tryoutMatch) {
    const volumeId = parseInt(tryoutMatch[1], 10);

    const purchasedRaw = request.cookies.get(PURCHASED_COOKIE)?.value ?? "";
    const purchasedIds = purchasedRaw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter(Boolean);

    if (!purchasedIds.includes(volumeId)) {
      return NextResponse.redirect(
        new URL(`/checkout/${volumeId}`, request.url)
      );
    }
  }

  // ── 5. Semua cek lolos ──
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};