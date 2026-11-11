import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/database/schema";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ orderId: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!z.string().min(1).max(64).safeParse(orderId).success) {
    return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, session.user.id)),
    columns: { id: true, status: true, amount: true, paidAt: true },
    with: { package: { columns: { title: true } } },
  });

  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    status: order.status,
    amount: order.amount,
    paidAt: order.paidAt?.toISOString() ?? null,
    packageTitle: order.package?.title ?? "Paket Tryout",
  });
}
