/**
 * app/admin/orders/page.tsx
 */

import { db } from "@/db";
import { orders, users, tryoutPackages } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const allOrders = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      status: orders.status,
      paidAt: orders.paidAt,
      customerEmail: users.email,
      packageName: tryoutPackages.title,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(tryoutPackages, eq(orders.packageId, tryoutPackages.id))
    .orderBy(desc(orders.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daftar Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          Log audit monitoring rekonsiliasi data pembayaran pintu gerbang Midtrans.
        </p>
      </div>

      {/* Render Data Table Dinamis */}
      <DataTable 
        columns={columns} 
        data={allOrders} 
        searchKey="id" 
        searchPlaceholder="Cari berdasarkan Order ID..." 
      />
    </div>
  );
}