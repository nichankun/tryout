import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/database/schema";
import { OrderStatus } from "@/components/checkout/order-status";

export const dynamic = "force-dynamic";

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderId?: string }>;
}

export const metadata: Metadata = { title: "Status Pembayaran — ASNPedia" };

export default async function PaymentConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const [routeParams, query, session] = await Promise.all([params, searchParams, auth()]);
  if (!session?.user?.id) redirect(`/login?callbackUrl=/checkout/${routeParams.id}/konfirmasi`);

  const packageId = Number.parseInt(routeParams.id, 10);
  if (!Number.isInteger(packageId) || packageId < 1 || !query.orderId) notFound();

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, query.orderId), eq(orders.packageId, packageId), eq(orders.userId, session.user.id)),
    columns: { id: true, status: true, amount: true, paidAt: true },
    with: { package: { columns: { title: true } } },
  });
  if (!order) notFound();

  return (
    <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <OrderStatus
        orderId={order.id}
        packageId={packageId}
        initialOrder={{
          id: order.id,
          status: order.status,
          amount: order.amount,
          paidAt: order.paidAt?.toISOString() ?? null,
          packageTitle: order.package?.title ?? "Paket Tryout",
        }}
      />
    </main>
  );
}
