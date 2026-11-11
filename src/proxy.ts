/**
 * Cookie check is only an optimistic redirect. Protected pages, actions and
 * API routes perform the authoritative Better Auth and role checks.
 */

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/tryout", "/dashboard", "/checkout", "/riwayat", "/admin"] as const;

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!matchesRoute(pathname, protectedRoutes)) return NextResponse.next();

  const sessionCookie = getSessionCookie(request, { cookiePrefix: "asnpedia" });
  if (sessionCookie) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};
