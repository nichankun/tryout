/**
 * app/api/payment/webhook/route.ts
 * 
 * Endpoint Publik Penerima Callback Webhook dari Midtrans.
 * Menggunakan fitur Transaction Status Native dari midtrans-client SDK
 * untuk memvalidasi keamanan signature dan melakukan pembaruan ke Database Drizzle.
 */

import { NextResponse } from "next/server";
import midtransClient from "midtrans-client";
import { db } from "@/db";
import { orders, userAccess } from "@/db/database/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const API_ERRORS = {
  invalidJson: "Format JSON payload tidak valid.",
  missingFields: "Payload tidak lengkap. Pastikan integrasi dari Midtrans.",
  dbError: "Terjadi kesalahan internal pada server database.",
} as const;

// Inisialisasi Instans Midtrans Snap Client (Untuk kebutuhan Verifikasi Signature)
const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

type OrderStatus = "paid" | "pending" | "failed" | "unknown";

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
// METHOD HANDLER: POST (Menerima Notifikasi dari Server Midtrans)
// ==========================================
export async function POST(request: Request) {
  let notificationPayload: any;

  try {
    notificationPayload = await request.json();
  } catch {
    return NextResponse.json({ error: API_ERRORS.invalidJson }, { status: 400 });
  }

  try {
    // 1. Verifikasi Keaslian Notifikasi (Signature) langsung menembak API Midtrans
    // Method ini akan membuang error/melempar catch jika signature_key tidak cocok
    const verifiedNotification = await snapGateway.transaction.notification(notificationPayload);

    const orderId = verifiedNotification.order_id;
    const transactionStatus = verifiedNotification.transaction_status;
    const fraudStatus = verifiedNotification.fraud_status;
    const transactionId = verifiedNotification.transaction_id;

    if (!orderId) {
      return NextResponse.json({ error: API_ERRORS.missingFields }, { status: 400 });
    }

    const resolvedStatus = resolveStatus(transactionStatus, fraudStatus);
    console.info(`[Midtrans Webhook] order_id=${orderId} terdeteksi sebagai: ${resolvedStatus}`);

    // 2. Pencarian Data Log Transaksi Awal di Database Lokal
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    // Jika Midtrans mengirimkan order_id yang tidak ada di DB, anggap sukses (Bisa jadi dari sistem staging/dev)
    if (!orderRecord) {
      console.warn(`[Midtrans Webhook] Order tidak dikenali di sistem lokal: ${orderId}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Jika order sudah terekam sebagai paid sebelumnya, lewati proses mutasi redundan
    if (orderRecord.status === "paid") {
      console.info(`[Midtrans Webhook] Transaksi ${orderId} sudah terekam "paid". Melewati proses...`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 3. Mutasi Database (Atomic Transaction untuk Kasus Paid)
    if (resolvedStatus === "paid") {
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
        // Memanfaatkan onConflictDoNothing bawaan Postgre/Drizzle untuk pencegahan duplikasi data
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
    
    } else if (resolvedStatus === "pending") {
      await db
        .update(orders)
        .set({ status: "pending" })
        .where(eq(orders.id, orderId));

    } else if (resolvedStatus === "failed") {
      await db
        .update(orders)
        .set({ status: "failed" })
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