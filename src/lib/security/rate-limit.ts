import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/database/schema";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  storageUnavailable: boolean;
}

let lastCleanupAt = 0;

export function getRequestAddress(headers: Headers) {
  const headerName = process.env.AUTH_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!headerName || !/^[a-z0-9-]+$/.test(headerName)) return "unknown";

  const address = headers.get(headerName)?.trim();
  if (!address || address.includes(",") || isIP(address) === 0) return "unknown";
  return address;
}

export async function consumeRateLimit(input: {
  namespace: string;
  subject: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    return {
      allowed: process.env.NODE_ENV !== "production",
      retryAfterSeconds: input.windowMs / 1000,
      storageUnavailable: process.env.NODE_ENV === "production",
    };
  }

  const now = new Date();
  const key = createHmac("sha256", secret)
    .update(`${input.namespace}:${input.subject}`)
    .digest("hex");
  const windowCutoff = new Date(now.getTime() - input.windowMs);

  try {
    if (now.getTime() - lastCleanupAt >= 60 * 60 * 1000) {
      lastCleanupAt = now.getTime();
      void db
        .delete(rateLimitBuckets)
        .where(lt(rateLimitBuckets.updatedAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)))
        .catch((error: unknown) => console.error("[rate-limit] Cleanup failed:", error));
    }

    const [bucket] = await db
      .insert(rateLimitBuckets)
      .values({ key, hits: 1, windowStartedAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          hits: sql`CASE WHEN ${rateLimitBuckets.windowStartedAt} <= ${windowCutoff} THEN 1 ELSE ${rateLimitBuckets.hits} + 1 END`,
          windowStartedAt: sql`CASE WHEN ${rateLimitBuckets.windowStartedAt} <= ${windowCutoff} THEN ${now} ELSE ${rateLimitBuckets.windowStartedAt} END`,
          updatedAt: now,
        },
      })
      .returning({ hits: rateLimitBuckets.hits, windowStartedAt: rateLimitBuckets.windowStartedAt });

    const allowed = bucket.hits <= input.limit;
    return {
      allowed,
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((bucket.windowStartedAt.getTime() + input.windowMs - now.getTime()) / 1000)),
      storageUnavailable: false,
    };
  } catch (error) {
    console.error("[rate-limit] Storage unavailable:", error);
    return {
      allowed: process.env.NODE_ENV !== "production",
      retryAfterSeconds: Math.max(1, Math.ceil(input.windowMs / 1000)),
      storageUnavailable: process.env.NODE_ENV === "production",
    };
  }
}

export async function consumeAccountRateLimit(input: {
  namespace: string;
  headers: Headers;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const normalizedIdentifier = input.identifier.trim().toLowerCase();
  const address = getRequestAddress(input.headers);
  const limits = await Promise.all([
    consumeRateLimit({
      namespace: `${input.namespace}:account`,
      subject: normalizedIdentifier,
      limit: input.limit,
      windowMs: input.windowMs,
    }),
    ...(address === "unknown" ? [] : [consumeRateLimit({
      namespace: `${input.namespace}:address`,
      subject: address,
      limit: input.limit * 4,
      windowMs: input.windowMs,
    })]),
  ]);

  const blocked = limits.filter((result) => !result.allowed);
  return {
    allowed: blocked.length === 0 && limits.every((result) => !result.storageUnavailable),
    retryAfterSeconds: Math.max(0, ...blocked.map((result) => result.retryAfterSeconds)),
    storageUnavailable: limits.some((result) => result.storageUnavailable),
  };
}
