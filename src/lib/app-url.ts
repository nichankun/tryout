import "server-only";

const configuredAppUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim();

if (!configuredAppUrl) {
  throw new Error("BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL must be configured.");
}

const appUrl: string = configuredAppUrl;
const appUrlObject = new URL(appUrl);
const isLocalhost =
  appUrlObject.hostname === "localhost" ||
  appUrlObject.hostname.endsWith(".localhost") ||
  appUrlObject.hostname === "127.0.0.1" ||
  appUrlObject.hostname === "[::1]";

if (process.env.NODE_ENV === "production" && (appUrlObject.protocol !== "https:" || isLocalhost)) {
  throw new Error("A public HTTPS app URL must be configured in production.");
}

export { appUrl };
export const appOrigin = appUrlObject.origin;
