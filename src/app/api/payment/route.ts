/**
 * app/api/payment/route.ts
 * * Route Handler Khusus Pembuatan Transaksi (POST).
 * Dioptimalkan dengan Atomic Transaction dan Partial Query.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import midtransClient from "midtrans-client";
import { db } from "@/db";
import { orders, tryoutPackages, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const APP_CONFIG = { adminFee: 1000 } as const;

const PaymentBodySchema = z.object({
  volumeId: z.number().int().min(1),
  paymentMethod: z.enum(["qris", "transfer", "ewallet"]),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
});

const snapGateway = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = PaymentBodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT", details: body.error.flatten() }, { status: 400 });
  }

  const { volumeId, paymentMethod, name, email, phone } = body.data;

  try {
    // ── PARALLEL FETCHING: Paket & Cek Kepemilikan ──
    const [pkg, existingAccess] = await Promise.all([
      db.query.tryoutPackages.findFirst({
        where: and(eq(tryoutPackages.id, volumeId), eq(tryoutPackages.isActive, true)),
        columns: { title: true, price: true }
      }),
      db.query.userAccess.findFirst({
        where: and(eq(userAccess.userId, session.user.id), eq(userAccess.packageId, volumeId)),
        columns: { id: true }
      })
    ]);

    if (!pkg) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (existingAccess) return NextResponse.json({ error: "ALREADY_OWNED" }, { status: 409 });

    // ── GENERATE ORDER & SNAP TOKEN ──
    const orderId = `ASN-${volumeId}-${Date.now()}`;
    const grossTotal = pkg.price + APP_CONFIG.adminFee;

    const snapToken = await snapGateway.createTransactionToken({
      transaction_details: { order_id: orderId, gross_amount: grossTotal },
      customer_details: { first_name: name, email, phone },
      item_details: [
        { id: String(volumeId), price: pkg.price, quantity: 1, name: pkg.title },
        { id: "service-fee", price: APP_CONFIG.adminFee, quantity: 1, name: "Biaya Layanan" }
      ],
      enabled_payments: paymentMethod === "qris" ? ["gopay", "qris"] : 
                        paymentMethod === "ewallet" ? ["gopay", "shopeepay", "dana"] : 
                        ["bca_va", "bni_va", "bri_va", "mandiri_bill"]
    });

    // ── ATOMIC LOG ORDER ──
    await db.insert(orders).values({
      id: orderId,
      userId: session.user.id,
      packageId: volumeId,
      amount: grossTotal,
      status: "pending",
      snapToken: snapToken,
    });

    return NextResponse.json({ success: true, snapToken, orderId });

  } catch (err) {
    console.error("[POST /api/payment] Error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}