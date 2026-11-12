import "server-only";

import { appOrigin } from "@/lib/app-url";

/** Reject browser mutations that did not originate from the configured app origin. */
export function isTrustedRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;

  try {
    const requestOrigin = new URL(origin).origin;
    const allowedOrigins = [appOrigin];

    // Allow the local dev server when the shared production URL is also loaded
    // from .env; production always requires the explicitly configured origin.
    if (process.env.NODE_ENV !== "production") {
      allowedOrigins.push(new URL(request.url).origin);
    }

    return allowedOrigins.includes(requestOrigin);
  } catch {
    return false;
  }
}
