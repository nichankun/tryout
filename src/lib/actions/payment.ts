"use server";

/**
 * lib/actions/payment.ts
 *
 * ✅ Server Action untuk proses pembayaran
 * Di production: integrasikan dengan Midtrans / Xendit
 *
 * 📦 INSTALL Midtrans:
 *   npm install midtrans-client
 */

import { cookies } from "next/headers";

type PaymentMethod = "qris" | "transfer" | "ewallet";

interface CreatePaymentInput {
  volumeId: string;
  paymentMethod: PaymentMethod;
}

type ActionResult = { error: string } | null;

export async function createPaymentAction(
  input: CreatePaymentInput
): Promise<ActionResult> {
  const { volumeId, paymentMethod } = input;

  // Validasi input
  const id = parseInt(volumeId, 10);
  if (isNaN(id) || id < 1 || id > 20) return { error: "payment_failed" };
  if (!["qris", "transfer", "ewallet"].includes(paymentMethod)) {
    return { error: "payment_failed" };
  }

  // Cek session
  const cookieStore = await cookies();
  const session = cookieStore.get("asn_session")?.value;
  if (!session) return { error: "session_expired" };

  // ── Production: ganti blok ini dengan Midtrans ──
  // const snap = new midtransClient.Snap({ isProduction: false, serverKey: process.env.MIDTRANS_SERVER_KEY });
  // const transaction = await snap.createTransaction({ ... });
  // await prisma.order.create({ data: { userId, volumeId: id, status: "pending" } });
  // return { redirectUrl: transaction.redirect_url };

  // Mock: tandai volume sebagai sudah dibeli
  const purchased = cookieStore.get("asn_purchased")?.value ?? "";
  const purchasedIds = purchased.split(",").filter(Boolean);
  if (!purchasedIds.includes(String(id))) {
    purchasedIds.push(String(id));
  }

  cookieStore.set("asn_purchased", purchasedIds.join(","), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return null;
}