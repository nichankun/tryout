import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/database/schema";
import {
  applyMidtransStatus,
  getMidtransTransactionStatus,
  matchesPaymentOrder,
} from "@/lib/payments/midtrans";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!z.string().min(1).max(64).safeParse(orderId).success) {
    return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });
  }

  let order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, session.user.id)),
    columns: { id: true, userId: true, packageId: true, status: true, amount: true, paidAt: true, reconciliationRequired: true },
    with: { package: { columns: { title: true } } },
  });

  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  // Local polling stays cheap; sync=1 asks Midtrans for the authoritative state as a webhook fallback.
  if ((order.status === "pending" || order.reconciliationRequired) && new URL(request.url).searchParams.get("sync") === "1") {
    let remoteStatus: Awaited<ReturnType<typeof getMidtransTransactionStatus>> = null;
    try {
      remoteStatus = await getMidtransTransactionStatus(order.id);
    } catch {
      // Keep returning the last confirmed local state; the user can retry and Midtrans will retry webhooks.
    }

    if (remoteStatus && matchesPaymentOrder(order, remoteStatus)) {
      await applyMidtransStatus(order, remoteStatus);
      order = await db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.userId, session.user.id)),
        columns: { id: true, userId: true, packageId: true, status: true, amount: true, paidAt: true, reconciliationRequired: true },
        with: { package: { columns: { title: true } } },
      }) ?? order;
    }
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    amount: order.amount,
    paidAt: order.paidAt?.toISOString() ?? null,
    reconciliationRequired: order.reconciliationRequired,
    packageTitle: order.package?.title ?? "Paket Tryout",
  });
}
