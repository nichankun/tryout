"use server";

/**
 * lib/actions/payment.ts
 *
 * Server Action Produksi untuk Pemrosesan Gerbang Transaksi Pembayaran.
 * Dioptimalkan dengan Concurrent Promise.all, Partial Query Drizzle, 
 * dan pembungkusan Try-Catch menyeluruh untuk fail-safe eksekusi Midtrans SDK.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { orders, tryoutPackages, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import midtransClient from "midtrans-client";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  adminFee: 1000,
} as const;

const ACTION_ERRORS = {
  unauthorized: "session_expired",
  invalidVolume: "invalid_volume",
  alreadyOwned: "already_owned",
  paymentFailed: "payment_failed",
  freePackage: "free_package",
} as const;

const PAYMENT_CHANNELS = {
  qris: ["gopay", "qris"],
  ewallet: ["gopay", "shopeepay", "dana"],
  transfer: ["bca_va", "bni_va", "bri_va", "mandiri_bill"],
} as const;

// ── INTERFACES ──
// OPTIMASI: Otomatis mendeteksi tipe dari key PAYMENT_CHANNELS tanpa menulis ulang
type PaymentMethod = keyof typeof PAYMENT_CHANNELS;

interface CreatePaymentInput {
  volumeId: string | number; // Mendukung string dari params atau number
  paymentMethod: PaymentMethod;
}

type ActionResponse =
  | { success: true; snapToken: string; orderId: string }
  | { success: false; error: string };

// Inisialisasi Instans SDK Midtrans Snap Gateway (Singleton)
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
  // OPTIMASI: Try-Catch membungkus SELURUH blok, mencegah server crash jika SDK Midtrans timeout
  try {
    // ── 1. VALIDASI KEAMANAN SESI PENGGUNA (NextAuth v5) ──
    const session = await auth();
    if (!session?.user?.id || !session?.user?.name || !session?.user?.email) {
      return { success: false, error: ACTION_ERRORS.unauthorized };
    }

    const userId = session.user.id;
    const { volumeId, paymentMethod } = input;

    // ── 2. VALIDASI INTEGRITAS FORMAT INPUT ──
    const parsedVolumeId = typeof volumeId === "string" ? parseInt(volumeId, 10) : volumeId;
    
    if (isNaN(parsedVolumeId) || parsedVolumeId < 1) {
      return { success: false, error: ACTION_ERRORS.invalidVolume };
    }

    if (!(paymentMethod in PAYMENT_CHANNELS)) {
      return { success: false, error: ACTION_ERRORS.invalidVolume };
    }

    // ── 3. CONCURRENT DB FETCHING (Kunci Performa) ──
    // Menarik harga paket & mengecek kepemilikan User secara BERSAMAAN
    const [pkg, existingAccess] = await Promise.all([
      db.query.tryoutPackages.findFirst({
        where: and(
          eq(tryoutPackages.id, parsedVolumeId),
          eq(tryoutPackages.isActive, true)
        ),
        columns: { title: true, price: true } // Partial Query
      }),
      db.query.userAccess.findFirst({
        where: and(
          eq(userAccess.userId, userId),
          eq(userAccess.packageId, parsedVolumeId)
        ),
        columns: { id: true } // Partial Query
      })
    ]);

    // ── 4. GUARD KONDISI TRANSAKSI ──
    if (!pkg) {
      return { success: false, error: ACTION_ERRORS.invalidVolume };
    }
    if (existingAccess) {
      return { success: false, error: ACTION_ERRORS.alreadyOwned };
    }
    if (pkg.price === 0) {
      return { success: false, error: ACTION_ERRORS.freePackage };
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

    return { success: true, snapToken, orderId };
  } catch (err) {
    // Log disembunyikan dari client, hanya tampil di console server Vercel/VPS
    console.error("[Server Action Error] createPaymentAction:", err);
    return { success: false, error: ACTION_ERRORS.paymentFailed };
  }
}