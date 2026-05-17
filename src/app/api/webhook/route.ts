/**
 * app/api/payment/webhook/route.ts — FIXED
 *
 * [1] orders.midtransOrderId → orders.id
 *     Schema hanya punya kolom id, dan orderId dari api/payment/route.ts
 *     (format ASN-{volumeId}-{timestamp}) sudah dikirim ke Midtrans sebagai order_id,
 *     sehingga notif.order_id === orders.id
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";
import { eq } from "drizzle-orm";

interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  gross_amount: string;
  signature_key: string;
  status_code: string;
  transaction_id: string;
}

function verifySignature(notif: MidtransNotification): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error("[webhook] MIDTRANS_SERVER_KEY tidak ditemukan di env");
    return false;
  }
  const raw = `${notif.order_id}${notif.status_code}${notif.gross_amount}${serverKey}`;
  const expected = createHash("sha512").update(raw).digest("hex");
  return expected === notif.signature_key;
}

type OrderStatus = "paid" | "pending" | "failed" | "unknown";

function resolveStatus(notif: MidtransNotification): OrderStatus {
  const { transaction_status, fraud_status } = notif;
  if (transaction_status === "capture") {
    return fraud_status === "accept" ? "paid" : "failed";
  }
  if (transaction_status === "settlement") return "paid";
  if (transaction_status === "pending") return "pending";
  if (["deny", "cancel", "expire"].includes(transaction_status)) return "failed";
  return "unknown";
}

export async function POST(request: Request) {
  let notif: MidtransNotification;
  try {
    notif = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const required: (keyof MidtransNotification)[] = [
    "order_id",
    "transaction_status",
    "gross_amount",
    "signature_key",
    "status_code",
  ];
  for (const field of required) {
    if (!notif[field]) {
      return NextResponse.json(
        { error: `Field ${field} wajib ada.` },
        { status: 400 }
      );
    }
  }

  if (!verifySignature(notif)) {
    console.warn("[webhook] Signature tidak valid:", notif.order_id);
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  const status = resolveStatus(notif);
  console.info(`[webhook] order_id=${notif.order_id} status=${status}`);

  try {
    // ✅ [FIX 1] orders.id bukan orders.midtransOrderId
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, notif.order_id),
    });

    if (!order) {
      console.error("[webhook] Order tidak ditemukan:", notif.order_id);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (order.status === "paid") {
      console.info(`[webhook] Order ${notif.order_id} sudah diproses, skip.`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (status === "paid") {
      await db.transaction(async (tx) => {
        // ✅ [FIX 1] orders.id bukan orders.midtransOrderId
        await tx
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            transactionId: notif.transaction_id,
          })
          .where(eq(orders.id, notif.order_id));

        await tx
          .insert(userAccess)
          .values({
            userId: order.userId,
            packageId: order.packageId,
            purchasedAt: new Date(),
          })
          .onConflictDoNothing();
      });

      console.info(
        `[webhook] PAID — akses volume ${order.packageId} diberikan ke user ${order.userId}`
      );
    } else if (status === "pending") {
      // ✅ [FIX 1] orders.id bukan orders.midtransOrderId
      await db
        .update(orders)
        .set({ status: "pending" })
        .where(eq(orders.id, notif.order_id));

      console.info(`[webhook] PENDING — order ${notif.order_id}`);
    } else if (status === "failed") {
      // ✅ [FIX 1] orders.id bukan orders.midtransOrderId
      await db
        .update(orders)
        .set({ status: "failed" })
        .where(eq(orders.id, notif.order_id));

      console.info(`[webhook] FAILED — order ${notif.order_id}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] DB error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}