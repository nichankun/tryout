"use server";

/**
 * lib/actions/payment.ts
 *
 * Server Action Produksi untuk Pemrosesan Gerbang Transaksi Pembayaran.
 * Memvalidasi sesi NextAuth v5, melakukan kueri harga paket riil ke database,
 * dan mendaftarkan Snap Token pembayaran secara langsung lewat Midtrans SDK.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { orders, tryoutPackages, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import midtransClient from "midtrans-client";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  maxVolumeAllowed: 20,
  adminFee: 1000,
} as const;

const ACTION_ERRORS = {
  unauthorized: "session_expired",
  invalidVolume: "invalid_volume",
  alreadyOwned: "already_owned",
  paymentFailed: "payment_failed",
  freePackage: "free_package", // ✅ Tambahan: error khusus paket gratis
} as const;

const PAYMENT_CHANNELS = {
  qris: ["gopay", "qris"],
  ewallet: ["gopay", "shopeepay", "dana"],
  transfer: ["bca_va", "bni_va", "bri_va", "mandiri_bill"],
} as const;

// ── INTERFACES ──
type PaymentMethod = "qris" | "transfer" | "ewallet";

interface CreatePaymentInput {
  volumeId: string;
  paymentMethod: PaymentMethod;
}

type ActionResponse =
  | { success: true; snapToken: string; orderId: string }
  | { success: false; error: string };

// Inisialisasi Instans SDK Midtrans Snap Gateway
const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

// ==========================================
// ACTION EXECUTION UTAMA
// ==========================================
export async function createPaymentAction(
  input: CreatePaymentInput
): Promise<ActionResponse> {
  // ── 1. VALIDASI KEAMANAN SESI PENGGUNA (NextAuth v5) ──
  const session = await auth();
  if (!session?.user?.id || !session?.user?.name || !session?.user?.email) {
    return { success: false, error: ACTION_ERRORS.unauthorized };
  }

  const userId = session.user.id;
  const { volumeId, paymentMethod } = input;

  // ── 2. VALIDASI INTEGRITAS FORMAT INPUT ──
  const parsedVolumeId = parseInt(volumeId, 10);
  if (
    isNaN(parsedVolumeId) ||
    parsedVolumeId < 1 ||
    parsedVolumeId > APP_CONFIG.maxVolumeAllowed
  ) {
    return { success: false, error: ACTION_ERRORS.invalidVolume };
  }

  if (!["qris", "transfer", "ewallet"].includes(paymentMethod)) {
    return { success: false, error: ACTION_ERRORS.invalidVolume };
  }

  try {
    // ── 3. TARIK INFORMASI HARGA PAKET AKTIF DARI DATABASE ──
    const pkg = await db.query.tryoutPackages.findFirst({
      where: and(
        eq(tryoutPackages.id, parsedVolumeId),
        eq(tryoutPackages.isActive, true)
      ),
    });

    if (!pkg) {
      return { success: false, error: ACTION_ERRORS.invalidVolume };
    }

    // ── 3b. GUARD: Paket gratis tidak boleh diproses lewat payment gateway ──
    // ✅ Defense in depth — seharusnya sudah ditangani di checkout page
    if (pkg.price === 0) {
      return { success: false, error: ACTION_ERRORS.freePackage };
    }

    // ── 4. CEK STATUS KEPEMILIKAN (Pencegahan Pembelian Ganda) ──
    const existingAccess = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, parsedVolumeId)
      ),
    });

    if (existingAccess) {
      return { success: false, error: ACTION_ERRORS.alreadyOwned };
    }

    // ── 5. GENERATE ORDER ID & TOKEN TRANSAKSI VIA MIDTRANS SDK ──
    const orderId = `ASN-${parsedVolumeId}-${Date.now()}`;
    const packagePrice = pkg.price;
    const grossTotal = packagePrice + APP_CONFIG.adminFee;

    const snapToken = await snapGateway.createTransactionToken({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossTotal,
      },
      customer_details: {
        first_name: session.user.name.trim(),
        email: session.user.email.trim(),
      },
      item_details: [
        {
          id: String(parsedVolumeId),
          price: packagePrice,
          quantity: 1,
          name: pkg.title,
        },
        {
          id: "service-fee",
          price: APP_CONFIG.adminFee,
          quantity: 1,
          name: "Biaya Layanan",
        },
      ],
      enabled_payments: PAYMENT_CHANNELS[paymentMethod],
    });

    // ── 6. SISIPKAN MANIFEST LOG ORDER PENDING KE DATABASE LOKAL ──
    await db.insert(orders).values({
      id: orderId,
      userId: userId,
      packageId: parsedVolumeId,
      amount: grossTotal,
      status: "pending",
      snapToken: snapToken,
    });

    // Mengembalikan data lengkap payload untuk dieksekusi oleh window.snap.pay() di sisi client
    return { success: true, snapToken, orderId };
  } catch (err) {
    console.error("[Server Action Error] createPaymentAction:", err);
    return { success: false, error: ACTION_ERRORS.paymentFailed };
  }
}