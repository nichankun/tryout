import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import midtransClient from "midtrans-client";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";

export const dynamic = "force-dynamic";

const NotificationSchema = z.object({
  order_id: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().optional().nullable(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
  gross_amount: z.union([z.string(), z.number()]).transform(String),
  currency: z.string().min(1),
});

type ResolvedStatus = "paid" | "pending" | "failed" | "unknown";

const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

function resolveStatus(transactionStatus: string, fraudStatus?: string): ResolvedStatus {
  if (transactionStatus === "capture") return fraudStatus === "accept" ? "paid" : "failed";
  if (transactionStatus === "settlement") return "paid";
  if (transactionStatus === "pending") return "pending";
  if (["deny", "cancel", "expire"].includes(transactionStatus)) return "failed";
  return "unknown";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const notification = await snapGateway.transaction.notification(payload as Record<string, unknown>);
    const parsed = NotificationSchema.safeParse(notification);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_NOTIFICATION" }, { status: 400 });
    }

    const data = parsed.data;
    const resolvedStatus = resolveStatus(data.transaction_status, data.fraud_status);
    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        packageId: orders.packageId,
        amount: orders.amount,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, data.order_id))
      .limit(1);

    if (!order) {
      console.warn(`[Midtrans Webhook] Order tidak ditemukan: ${data.order_id}`);
      return NextResponse.json({ success: true });
    }

    const notifiedAmount = Number(data.gross_amount);
    if (data.currency !== "IDR" || !Number.isFinite(notifiedAmount) || notifiedAmount !== order.amount) {
      console.error(`[Midtrans Webhook] Nominal/mata uang tidak cocok untuk order ${order.id}`);
      return NextResponse.json({ error: "ORDER_AMOUNT_MISMATCH" }, { status: 400 });
    }

    if (order.status === "paid") return NextResponse.json({ success: true });

    if (resolvedStatus === "paid") {
      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            transactionId: data.transaction_id ?? null,
            paymentMethod: data.payment_type ?? null,
          })
          .where(and(eq(orders.id, order.id), ne(orders.status, "paid")));

        await tx
          .insert(userAccess)
          .values({ userId: order.userId, packageId: order.packageId, purchasedAt: new Date() })
          .onConflictDoNothing();
      });
    } else if (resolvedStatus === "pending" || resolvedStatus === "failed") {
      await db
        .update(orders)
        .set({
          status: resolvedStatus,
          transactionId: data.transaction_id ?? null,
          paymentMethod: data.payment_type ?? null,
        })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "[Midtrans Webhook] Verification or processing failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
