import { NextResponse } from "next/server";
import { createHash } from "crypto";
// import { db } from "@/db";
// import { orders, userPackages } from "@/db/database/schema";
// import { eq } from "drizzle-orm";

// ── TYPES ──────────────────────────────────────────────────────────────────

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

// ── HELPER: Verifikasi signature Midtrans ──────────────────────────────────
// Rumus resmi: SHA512(order_id + status_code + gross_amount + server_key)

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

// ── HELPER: Tentukan status order dari notifikasi Midtrans ─────────────────

type OrderStatus = "paid" | "pending" | "failed" | "unknown";

function resolveStatus(notif: MidtransNotification): OrderStatus {
  const { transaction_status, fraud_status } = notif;

  if (transaction_status === "capture") {
    return fraud_status === "accept" ? "paid" : "failed";
  }
  if (transaction_status === "settlement") return "paid";
  if (transaction_status === "pending") return "pending";
  if (
    transaction_status === "deny" ||
    transaction_status === "cancel" ||
    transaction_status === "expire"
  ) {
    return "failed";
  }

  return "unknown";
}

// ── ROUTE HANDLER ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── 1. PARSE BODY ────────────────────────────────────────────────────────
  let notif: MidtransNotification;
  try {
    notif = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // ── 2. VALIDASI FIELD WAJIB ──────────────────────────────────────────────
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

  // ── 3. VERIFIKASI SIGNATURE ──────────────────────────────────────────────
  // ✅ Wajib — mencegah request palsu dari luar Midtrans
  if (!verifySignature(notif)) {
    console.warn("[webhook] Signature tidak valid:", notif.order_id);
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  // ── 4. RESOLVE STATUS ────────────────────────────────────────────────────
  const status = resolveStatus(notif);
  console.info(`[webhook] order_id=${notif.order_id} status=${status}`);

  // ── 5. UPDATE DATABASE ───────────────────────────────────────────────────
  try {
    if (status === "paid") {
      // Production: update status order + beri akses volume ke user
      //
      // const order = await db.query.orders.findFirst({
      //   where: eq(orders.midtransOrderId, notif.order_id),
      // });
      // if (!order) {
      //   console.error("[webhook] Order tidak ditemukan:", notif.order_id);
      //   return NextResponse.json({ error: "Order not found." }, { status: 404 });
      // }
      //
      // await db.transaction(async (tx) => {
      //   // Update status order
      //   await tx
      //     .update(orders)
      //     .set({ status: "paid", paidAt: new Date(), transactionId: notif.transaction_id })
      //     .where(eq(orders.midtransOrderId, notif.order_id));
      //
      //   // Beri akses volume ke user
      //   await tx.insert(userPackages).values({
      //     userId: order.userId,
      //     packageId: order.packageId,
      //     grantedAt: new Date(),
      //   });
      // });

      console.info(`[webhook] PAID — beri akses volume untuk order ${notif.order_id}`);
    } else if (status === "pending") {
      // Production: update status order ke "pending"
      // await db
      //   .update(orders)
      //   .set({ status: "pending" })
      //   .where(eq(orders.midtransOrderId, notif.order_id));

      console.info(`[webhook] PENDING — order ${notif.order_id} menunggu pembayaran`);
    } else if (status === "failed") {
      // Production: update status order ke "failed"
      // await db
      //   .update(orders)
      //   .set({ status: "failed" })
      //   .where(eq(orders.midtransOrderId, notif.order_id));

      console.info(`[webhook] FAILED — order ${notif.order_id} gagal/dibatalkan`);
    }

    // ✅ Midtrans butuh response 200 OK — jika tidak, akan retry hingga 5x
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] DB error:", err);
    // ✅ Return 500 agar Midtrans tahu perlu retry
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}