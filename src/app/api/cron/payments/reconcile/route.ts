import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcilePendingPayments } from "@/lib/payments/reconciliation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;

  const expected = Buffer.from(secret, "utf8");
  const provided = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    return NextResponse.json(
      { error: "RECONCILIATION_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isAuthorized(request, secret)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const summary = await reconcilePendingPayments();
    return NextResponse.json(
      { success: true, ...summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[Payment Reconciliation] Scheduled run failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "RECONCILIATION_FAILED" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
