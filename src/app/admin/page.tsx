/**
 * app/admin/page.tsx
 */

import { db } from "@/db";
import { orders, users, tryoutPackages } from "@/db/database/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, CreditCard, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // ── 1. AGREGASI DATA STATISTIK ──
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
  const [packageCount] = await db.select({ count: sql<number>`count(*)` }).from(tryoutPackages);
  
  // Menghitung total omset pendapatan bersih (status lunas)
  const [revenueResult] = await db
    .select({ total: sql<number>`sum(${orders.amount})` })
    .from(orders)
    .where(eq(orders.status, "paid"));

  const totalRevenue = revenueResult?.total ?? 0;

  // ── 2. AMBIL LOG AKTIVITAS TERBARU (JOIN) ──
  const recentTransactions = await db
    .select({
      id: orders.id,
      amount: orders.amount,
      status: orders.status,
      customerName: users.name,
      packageName: tryoutPackages.title,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(tryoutPackages, eq(orders.packageId, tryoutPackages.id))
    .orderBy(desc(orders.id))
    .limit(5);

  const stats = [
    { title: "Total Pendapatan", value: `Rp ${totalRevenue.toLocaleString("id-ID")}`, icon: CreditCard, color: "text-emerald-500" },
    { title: "Total Pengguna", value: userCount.count, icon: Users, color: "text-blue-500" },
    { title: "Transaksi Masuk", value: orderCount.count, icon: ShoppingBag, color: "text-amber-500" },
    { title: "Paket Tryout Aktif", value: packageCount.count, icon: LayoutDashboard, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ringkasan Performa</h1>
        <p className="text-sm text-muted-foreground">Analisis metrik operasional platform simulasi CAT ASNPedia.</p>
      </div>

      {/* Grid Metrik Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabel Aktivitas Terbaru */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Order ID</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Produk Paket</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx) => (
                <TableRow key={tx.id} className="border-border hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                  <TableCell className="font-medium">{tx.customerName}</TableCell>
                  <TableCell>{tx.packageName}</TableCell>
                  <TableCell>Rp {tx.amount.toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={tx.status === "paid" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}>
                      {tx.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}