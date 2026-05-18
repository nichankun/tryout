/**
 * app/api/payment/route.ts
 * 
 * Route Handler Produksi untuk Manajemen Transaksi Pembayaran.
 * POST: Validasi payload Zod, cek kepemilikan paket, inisiasi Snap Token Midtrans, & simpan status pending.
 * PUT: Webhook callback Midtrans untuk mutasi status "paid" dan pemberian hak akses userAccess.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import midtransClient from "midtrans-client";
import { db } from "@/db";
import { orders, userAccess, tryoutPackages } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  maxVolumeAllowed: 20,
  adminFee: 1000,
} as const;

const API_ERRORS = {
  unauthorized: "UNAUTHORIZED",
  invalidVolume: "INVALID_VOLUME",
  alreadyOwned: "ALREADY_OWNED",
  paymentFailed: "PAYMENT_FAILED",
  webhookFailed: "WEBHOOK_FAILED",
} as const;

const PAYMENT_CHANNELS = {
  qris: ["gopay", "qris"],
  ewallet: ["gopay", "shopeepay", "dana"],
  transfer: ["bca_va", "bni_va", "bri_va", "mandiri_bill"],
} as const;

// Skema Validasi Body Request Pembelian
const PaymentBodySchema = z.object({
  volumeId: z.number().int().min(1).max(APP_CONFIG.maxVolumeAllowed),
  paymentMethod: z.enum(["qris", "transfer", "ewallet"]),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

// Inisialisasi Instans Midtrans Client Snap SDK
const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

// ─────────────────────────────────────────
// 1. ENDPOINT: PEMBUATAN TRANSAKSI (POST)
// ─────────────────────────────────────────
export async function POST(request: Request) {
  // ── A. PROTEKSI INTEGRITAS SESI (NextAuth v5 Check) ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: API_ERRORS.unauthorized }, { status: 401 });
  }

  const userId = session.user.id;

  // ── B. VALIDASI DATA PAYLOAD REQUEST BODY ──
  let body: z.infer<typeof PaymentBodySchema>;
  try {
    const rawData = await request.json();
    body = PaymentBodySchema.parse(rawData);
  } catch {
    return NextResponse.json(
      { error: API_ERRORS.invalidVolume, message: "Data request tidak valid." },
      { status: 400 }
    );
  }

  const { volumeId, paymentMethod, name, email, phone } = body;

  try {
    // ── C. KONSUMSI DATA REAL HARGA PAKET DARI DATABASE ──
    const pkg = await db.query.tryoutPackages.findFirst({
      where: and(
        eq(tryoutPackages.id, volumeId),
        eq(tryoutPackages.isActive, true)
      ),
    });

    if (!pkg) {
      return NextResponse.json(
        { error: API_ERRORS.invalidVolume, message: "Paket tryout tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    // ── D. CEK STATUS KEPEMILIKAN PAKET ──
    const existingAccess = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, volumeId)
      ),
    });

    if (existingAccess) {
      return NextResponse.json({ error: API_ERRORS.alreadyOwned }, { status: 409 });
    }

    // ── E. GENERATE PARAMETER TRANSAKSI & TOKEN SNAP MIDTRANS ──
    const orderId = `ASN-${volumeId}-${Date.now()}`;
    const packagePrice = pkg.price;
    const grossTotal = packagePrice + APP_CONFIG.adminFee;

    const snapToken = await snapGateway.createTransactionToken({
      transaction_details: { 
        order_id: orderId, 
        gross_amount: grossTotal 
      },
      customer_details: { 
        first_name: name.trim(), 
        email: email.trim(), 
        phone: phone?.trim() 
      },
      item_details: [
        {
          id: String(volumeId),
          price: packagePrice,
          quantity: 1,
          name: pkg.title,
        }, 
        {
          id: "service-fee",
          price: APP_CONFIG.adminFee,
          quantity: 1,
          name: "Biaya Layanan",
        }
      ],
      enabled_payments: PAYMENT_CHANNELS[paymentMethod],
    });

    // ── F. SIMPAN LOG ORDER PENDING KE DALAM DATABASE DEREZEL ──
    await db.insert(orders).values({
      id: orderId,
      userId: userId,
      packageId: volumeId,
      amount: grossTotal,
      status: "pending",
      snapToken: snapToken,
    });

    return NextResponse.json({ success: true, snapToken, orderId });

  } catch (err) {
    console.error("[API ERROR] POST /api/payment:", err);
    return NextResponse.json(
      { error: API_ERRORS.paymentFailed, message: "Gagal memproses pembuatan tagihan pembayaran." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────
// 2. ENDPOINT: CALLBACK WEBHOOK MIDTRANS (PUT)
// ─────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const notificationPayload = await request.json();

    // Validasi & Sinkronisasi Keaslian Status Langsung dari Engine API Midtrans
    const statusResponse = await snapGateway.transaction.notification(notificationPayload);
    const { order_id, transaction_status, fraud_status } = statusResponse;

    const isSettled = 
      (transaction_status === "capture" && fraud_status === "accept") || 
      transaction_status === "settlement";

    if (isSettled) {
      // A. Mutasi Status Transaksi Order Menjadi Lunas ("paid")
      await db
        .update(orders)
        .set({ status: "paid" })
        .where(eq(orders.id, order_id));

      // B. Cari Informasi Log Order Terkait untuk Mengetahui Target User ID
      const targetOrder = await db.query.orders.findFirst({ 
        where: eq(orders.id, order_id) 
      });

      if (targetOrder) {
        // C. Cek redundansi sebelum memberikan izin akses modul paket simulasi
        const checkDuplicateAccess = await db.query.userAccess.findFirst({
          where: and(
            eq(userAccess.userId, targetOrder.userId),
            eq(userAccess.packageId, targetOrder.packageId)
          )
        });

        if (!checkDuplicateAccess) {
          await db.insert(userAccess).values({
            userId: targetOrder.userId,
            packageId: targetOrder.packageId,
          });
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[API ERROR] PUT /api/payment (Webhook):", err);
    return NextResponse.json({ error: API_ERRORS.webhookFailed }, { status: 500 });
  }
}