import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import midtransClient from "midtrans-client";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders, questions, tryoutPackages, userAccess } from "@/db/database/schema";
import { SERVICE_FEE } from "@/lib/constants/billing";
import { isTrustedRequestOrigin } from "@/lib/security/request-origin";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const PaymentBodySchema = z.object({
  volumeId: z.number().int().positive(),
  paymentMethod: z.enum(["qris", "transfer", "ewallet"]),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional(),
});

const PAYMENT_CHANNELS = {
  qris: ["gopay", "qris"],
  transfer: ["bca_va", "bni_va", "bri_va", "mandiri_bill"],
  ewallet: ["gopay", "shopeepay", "dana"],
} as const;

const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  }

  const rateLimit = await consumeAccountRateLimit({
    namespace: "payment-create",
    headers: request.headers,
    identifier: session.user.id,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (rateLimit.storageUnavailable) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const body = PaymentBodySchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: body.error.flatten() }, { status: 400 });
  }

  if (!process.env.MIDTRANS_SERVER_KEY || !process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
    return NextResponse.json({ error: "PAYMENT_UNAVAILABLE" }, { status: 503 });
  }

  const { volumeId, paymentMethod, name, email, phone } = body.data;
  try {
    const [pkg, existingAccess, questionCountResult] = await Promise.all([
      db.query.tryoutPackages.findFirst({
        where: and(eq(tryoutPackages.id, volumeId), eq(tryoutPackages.isActive, true)),
        columns: { title: true, price: true },
      }),
      db.query.userAccess.findFirst({
        where: and(eq(userAccess.userId, session.user.id), eq(userAccess.packageId, volumeId)),
        columns: { id: true },
      }),
      db.select({ total: count() }).from(questions).where(eq(questions.packageId, volumeId)),
    ]);

    if (!pkg) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (existingAccess) return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });
    if ((questionCountResult[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "PACKAGE_UNAVAILABLE" }, { status: 409 });
    }
    if (pkg.price <= 0) return NextResponse.json({ error: "FREE_PACKAGE" }, { status: 409 });

    const amount = pkg.price + SERVICE_FEE;
    if (!Number.isSafeInteger(amount)) {
      return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
    }

    const orderId = `ASN-${volumeId}-${randomUUID()}`;
    await db.insert(orders).values({
      id: orderId,
      userId: session.user.id,
      packageId: volumeId,
      amount,
      status: "pending",
      paymentMethod,
    });

    try {
      const snapToken = await snapGateway.createTransactionToken({
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: { first_name: name, email, phone },
        item_details: [
          { id: String(volumeId), price: pkg.price, quantity: 1, name: pkg.title },
          { id: "service-fee", price: SERVICE_FEE, quantity: 1, name: "Biaya Layanan" },
        ],
        enabled_payments: PAYMENT_CHANNELS[paymentMethod],
      });

      await db.update(orders).set({ snapToken }).where(eq(orders.id, orderId));
      return NextResponse.json({ success: true, snapToken, orderId });
    } catch (error) {
      await db.update(orders).set({ status: "failed" }).where(eq(orders.id, orderId));
      throw error;
    }
  } catch (error) {
    console.error(
      "[POST /api/payment] Payment processing failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "PAYMENT_FAILED" }, { status: 502 });
  }
}
