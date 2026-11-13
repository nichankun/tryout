import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders, questions, tryoutPackages, userAccess } from "@/db/database/schema";
import { SERVICE_FEE } from "@/lib/constants/billing";
import {
  cancelMidtransSnapSession,
  createMidtransSnapToken,
  getMidtransExpiryStartTime,
} from "@/lib/payments/midtrans";
import { PAYMENT_ORDER_RECOVERY_WINDOW_MS, reconcilePendingOrder } from "@/lib/payments/reconciliation";
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
  qris: ["other_qris"],
  transfer: ["bca_va", "bni_va", "bri_va", "echannel"],
  ewallet: ["gopay", "shopeepay", "dana"],
} as const;

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
    const [pkg, questionCountResult] = await Promise.all([
      db.query.tryoutPackages.findFirst({
        where: and(eq(tryoutPackages.id, volumeId), eq(tryoutPackages.isActive, true)),
        columns: { title: true, price: true },
      }),
      db.select({ total: count() }).from(questions).where(eq(questions.packageId, volumeId)),
    ]);

    if (!pkg) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if ((questionCountResult[0]?.total ?? 0) === 0) {
      return NextResponse.json({ error: "PACKAGE_UNAVAILABLE" }, { status: 409 });
    }
    if (pkg.price <= 0) return NextResponse.json({ error: "FREE_PACKAGE" }, { status: 409 });

    const amount = pkg.price + SERVICE_FEE;
    if (!Number.isSafeInteger(amount)) {
      return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const reservation = await db.transaction(async (tx) => {
        // Serialize checkout attempts for the same account and package without holding a lock during Midtrans API calls.
        const lockKey = `${session.user.id}:${volumeId}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

        const [existingAccess] = await tx
          .select({ id: userAccess.id })
          .from(userAccess)
          .where(and(eq(userAccess.userId, session.user.id), eq(userAccess.packageId, volumeId)))
          .limit(1);
        if (existingAccess) return { kind: "owned" as const };

        const [disputedOrder] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(
            eq(orders.userId, session.user.id),
            eq(orders.packageId, volumeId),
            eq(orders.status, "disputed"),
          ))
          .limit(1);
        if (disputedOrder) return { kind: "review" as const };

        const pendingOrders = await tx
          .select({
            id: orders.id,
            snapToken: orders.snapToken,
            createdAt: orders.createdAt,
            amount: orders.amount,
            paymentMethod: orders.paymentMethod,
          })
          .from(orders)
          .where(and(
            eq(orders.userId, session.user.id),
            eq(orders.packageId, volumeId),
            eq(orders.status, "pending"),
          ))
          .orderBy(desc(orders.createdAt))
          .limit(26);

        const recoveryCutoff = new Date(Date.now() - PAYMENT_ORDER_RECOVERY_WINDOW_MS);
        const recoveryOrders = await tx
          .select({
            id: orders.id,
            snapToken: orders.snapToken,
            createdAt: orders.createdAt,
            amount: orders.amount,
            paymentMethod: orders.paymentMethod,
          })
          .from(orders)
          .where(and(
            eq(orders.userId, session.user.id),
            eq(orders.packageId, volumeId),
            eq(orders.status, "failed"),
            or(
              eq(orders.reconciliationRequired, true),
              isNull(orders.createdAt),
              gte(orders.createdAt, recoveryCutoff),
            ),
          ))
          .orderBy(desc(orders.createdAt))
          .limit(26);

        if (pendingOrders.length + recoveryOrders.length > 25) return { kind: "reconcile" as const };
        const [pendingOrder, ...duplicateOrders] = pendingOrders;
        const relatedOrders = [...duplicateOrders, ...recoveryOrders].map((order) => ({
          ...order,
          userId: session.user.id,
          packageId: volumeId,
        }));

        if (pendingOrder?.snapToken && pendingOrder.amount === amount && pendingOrder.paymentMethod === paymentMethod) {
          return {
            kind: "reuse" as const,
            orderId: pendingOrder.id,
            snapToken: pendingOrder.snapToken,
            amount: pendingOrder.amount,
            createdAt: pendingOrder.createdAt,
            relatedOrders,
          };
        }

        if (pendingOrder?.snapToken) {
          return {
            kind: "replace" as const,
            pendingOrders: [pendingOrder, ...duplicateOrders, ...recoveryOrders].map((pending) => ({
              ...pending,
              userId: session.user.id,
              packageId: volumeId,
            })),
          };
        }

        if (pendingOrder) {
          const pendingAgeMs = Date.now() - (pendingOrder.createdAt?.getTime() ?? Date.now());
          if (pendingAgeMs < 10 * 60 * 1000 && relatedOrders.length === 0) {
            return { kind: "creating" as const };
          }
          return {
            kind: "replace" as const,
            pendingOrders: [pendingOrder, ...duplicateOrders, ...recoveryOrders].map((pending) => ({
              ...pending,
              userId: session.user.id,
              packageId: volumeId,
            })),
          };
        }

        if (recoveryOrders.length > 0) {
          return { kind: "replace" as const, pendingOrders: relatedOrders };
        }

        const orderId = `ASN-${volumeId}-${randomUUID()}`;
        await tx.insert(orders).values({
          id: orderId,
          userId: session.user.id,
          packageId: volumeId,
          amount,
          status: "pending",
          paymentMethod,
        });
        return { kind: "created" as const, orderId };
      });

      if (reservation.kind === "owned") {
        return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });
      }
      if (reservation.kind === "review") {
        return NextResponse.json({ error: "PAYMENT_REVIEW_REQUIRED" }, { status: 409 });
      }
      if (reservation.kind === "creating") {
        return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
      }
      if (reservation.kind === "reconcile") {
        return NextResponse.json({ error: "PAYMENT_RECONCILIATION_REQUIRED" }, { status: 409 });
      }
      if (reservation.kind === "replace") {
        for (const pendingOrder of reservation.pendingOrders) {
          const result = await reconcilePendingOrder(pendingOrder, { cancelIfStillPending: true });
          if (result.status === "paid" || result.status === "partially_refunded") {
            return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });
          }
          if (result.status === "disputed") {
            return NextResponse.json({ error: "PAYMENT_REVIEW_REQUIRED" }, { status: 409 });
          }
          if (!result.closed) {
            return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
          }
        }
        continue;
      }

      if (reservation.kind === "reuse") {
        for (const relatedOrder of reservation.relatedOrders) {
          const relatedResult = await reconcilePendingOrder(relatedOrder, { cancelIfStillPending: true });
          if (relatedResult.status === "paid" || relatedResult.status === "partially_refunded") {
            return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });
          }
          if (relatedResult.status === "disputed") {
            return NextResponse.json({ error: "PAYMENT_REVIEW_REQUIRED" }, { status: 409 });
          }
          if (!relatedResult.closed) {
            return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
          }
        }

        let result: Awaited<ReturnType<typeof reconcilePendingOrder>>;
        try {
          result = await reconcilePendingOrder({
            id: reservation.orderId,
            userId: session.user.id,
            packageId: volumeId,
            amount: reservation.amount,
            snapToken: reservation.snapToken,
            createdAt: reservation.createdAt,
          });
        } catch {
          // Reuse the existing token if status lookup is temporarily unavailable; never create a second charge.
          return NextResponse.json({
            success: true,
            snapToken: reservation.snapToken,
            orderId: reservation.orderId,
          });
        }

        const currentOrder = await db.query.orders.findFirst({
          where: eq(orders.id, reservation.orderId),
          columns: { status: true },
        });
        if (currentOrder?.status === "paid" || currentOrder?.status === "partially_refunded" || result.status === "paid" || result.status === "partially_refunded") {
          return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });
        }
        if (currentOrder?.status === "failed" || currentOrder?.status === "refunded" || result.status === "failed" || result.status === "refunded") continue;
        if (currentOrder?.status === "disputed" || result.status === "disputed") {
          return NextResponse.json({ error: "PAYMENT_REVIEW_REQUIRED" }, { status: 409 });
        }
        if (result.status === "unknown") {
          return NextResponse.json({ error: "PAYMENT_STATUS_UNAVAILABLE" }, { status: 502 });
        }

        return NextResponse.json({
          success: true,
          snapToken: reservation.snapToken,
          orderId: reservation.orderId,
        });
      }

      try {
        const snapToken = await createMidtransSnapToken({
          transaction_details: { order_id: reservation.orderId, gross_amount: amount },
          customer_details: { first_name: name, email, phone },
          item_details: [
            { id: String(volumeId), price: pkg.price, quantity: 1, name: pkg.title },
            { id: "service-fee", price: SERVICE_FEE, quantity: 1, name: "Biaya Layanan" },
          ],
          enabled_payments: PAYMENT_CHANNELS[paymentMethod],
          expiry: {
            start_time: getMidtransExpiryStartTime(),
            unit: "minutes",
            duration: 60,
          },
          page_expiry: { duration: 60, unit: "minutes" },
        });

        const [updatedOrder] = await db
          .update(orders)
          .set({ snapToken })
          .where(and(
            eq(orders.id, reservation.orderId),
            eq(orders.status, "pending"),
            isNull(orders.snapToken),
          ))
          .returning({ id: orders.id });
        if (!updatedOrder) {
          try {
            await cancelMidtransSnapSession(snapToken);
          } catch {
            console.error(`[POST /api/payment] Could not cancel Snap session for stale order ${reservation.orderId}.`);
          }
          return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
        }
        return NextResponse.json({ success: true, snapToken, orderId: reservation.orderId });
      } catch (error) {
        // Keep the order pending after an ambiguous timeout. Midtrans may have created
        // the transaction even when this request did not receive its Snap token.
        throw error;
      }
    }

    return NextResponse.json({ error: "PAYMENT_IN_PROGRESS" }, { status: 409 });
  } catch (error) {
    console.error(
      "[POST /api/payment] Payment processing failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "PAYMENT_FAILED" }, { status: 502 });
  }
}
