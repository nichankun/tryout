/**
 * app/api/payment/webhook/route.ts
 * * Endpoint Publik Penerima Callback Webhook dari Midtrans.
 * Dioptimalkan dengan Partial Drizzle Query (Memory Efficient), 
 * Strict TypeScript Interfaces, dan Atomic Transactions untuk reliabilitas tingkat tinggi.
 */

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & TYPE DEFINITIONS
// ==========================================
const API_ERRORS = {
  invalidJson: "Format JSON payload tidak valid.",
  missingFields: "Payload tidak lengkap. Pastikan integrasi dari Midtrans.",
  dbError: "Terjadi kesalahan internal pada server database.",
} as const;

type OrderStatus = "paid" | "pending" | "failed" | "unknown";

// OPTIMASI: Menghilangkan tipe 'any' dengan mendefinisikan interface standar Midtrans
interface MidtransNotificationPayload {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  [key: string]: unknown; // Mengakomodasi properti tambahan dari Midtrans
}

// Inisialisasi Instans Midtrans Snap Client (Singleton)
const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

// Helper Resolusi Konversi Status Midtrans -> Status Internal Database
function resolveStatus(transactionStatus: string, fraudStatus?: string): OrderStatus {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "paid" : "failed";
  }
  if (transactionStatus === "settlement") return "paid";
  if (transactionStatus === "pending") return "pending";
  if (["deny", "cancel", "expire"].includes(transactionStatus)) return "failed";
  
  return "unknown";
}

// ==========================================
// METHOD HANDLER: POST
// ==========================================
export async function POST(request: Request) {
  let notificationPayload: MidtransNotificationPayload;

  try {
    notificationPayload = await request.json();
  } catch {
    return NextResponse.json({ error: API_ERRORS.invalidJson }, { status: 400 });
  }

  try {
    // 1. Verifikasi Keaslian Notifikasi (Signature) langsung menembak API Midtrans
    // Method ini akan melempar catch jika signature_key tidak cocok/palsu
    // PERBAIKAN TYPE-CHECKING: Menambahkan "as MidtransNotificationPayload" 
    const verifiedNotification = (await snapGateway.transaction.notification(
      notificationPayload as Record<string, unknown>
    )) as MidtransNotificationPayload;

    const orderId = verifiedNotification.order_id;
    const transactionStatus = verifiedNotification.transaction_status;
    const fraudStatus = verifiedNotification.fraud_status;
    const transactionId = verifiedNotification.transaction_id;

    if (!orderId) {
      return NextResponse.json({ error: API_ERRORS.missingFields }, { status: 400 });
    }

    const resolvedStatus = resolveStatus(transactionStatus, fraudStatus);
    console.info(`[Midtrans Webhook] order_id=${orderId} terdeteksi sebagai: ${resolvedStatus}`);

    // 2. OPTIMASI: Partial Query - Hanya mengambil kolom yang dipakai untuk validasi & mutasi
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        userId: true,
        packageId: true,
        status: true,
      }
    });

    // Jika Midtrans mengirimkan order_id yang tidak ada di DB, anggap sukses 
    if (!orderRecord) {
      console.warn(`[Midtrans Webhook] Order tidak dikenali di sistem lokal: ${orderId}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // IDEMPOTENCY GUARD: Jika order sudah terekam sebagai paid sebelumnya, lewati proses
    if (orderRecord.status === "paid") {
      console.info(`[Midtrans Webhook] Transaksi ${orderId} sudah terekam "paid". Melewati proses...`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Jika status tidak berubah, tidak perlu buang waktu memanggil update DB
    if (orderRecord.status === resolvedStatus) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 3. Mutasi Database
    if (resolvedStatus === "paid") {
      // Atomic Transaction untuk Kasus Paid
      await db.transaction(async (tx) => {
        // A. Perbarui Status Log Order Pembayaran
        await tx
          .update(orders)
          .set({
            status: "paid",
            paidAt: new Date(),
            transactionId: transactionId,
          })
          .where(eq(orders.id, orderId));

        // B. Sisipkan Izin Hak Akses Paket (Buka Gembok Tryout)
        await tx
          .insert(userAccess)
          .values({
            userId: orderRecord.userId,
            packageId: orderRecord.packageId,
            purchasedAt: new Date(),
          })
          .onConflictDoNothing();
      });

      console.info(`[Midtrans Webhook] SUCCESS - Izin paket ${orderRecord.packageId} berhasil dibuka untuk pengguna ${orderRecord.userId}`);
    
    } else if (resolvedStatus === "pending" || resolvedStatus === "failed") {
      // Update status biasa (bukan paid) tidak memerlukan transaction block
      await db
        .update(orders)
        .set({ status: resolvedStatus })
        .where(eq(orders.id, orderId));
    }

    // Selalu respon 200 OK ke Midtrans setelah berhasil diproses agar Midtrans berhenti mengulang ping (retry)
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    // Akan terpanggil jika `snapGateway.transaction.notification()` gagal (Signature salah/Fraud)
    console.error("[Midtrans Webhook Error]:", err);
    return NextResponse.json({ error: API_ERRORS.dbError }, { status: 500 });
  }
}