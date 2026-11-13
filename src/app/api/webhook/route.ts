import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/database/schema";
import {
  applyMidtransStatus,
  matchesPaymentOrder,
  verifyMidtransNotification,
} from "@/lib/payments/midtrans";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.MIDTRANS_SERVER_KEY?.trim()) {
    return NextResponse.json({ error: "PAYMENT_WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  try {
    const data = verifyMidtransNotification(payload);
    if (!data) return NextResponse.json({ error: "INVALID_NOTIFICATION_SIGNATURE" }, { status: 401 });

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

    if (!matchesPaymentOrder(order, data)) {
      console.error(`[Midtrans Webhook] Nominal/mata uang tidak cocok untuk order ${order.id}`);
      return NextResponse.json({ error: "ORDER_AMOUNT_MISMATCH" }, { status: 400 });
    }

    await applyMidtransStatus(order, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "[Midtrans Webhook] Verification or processing failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
