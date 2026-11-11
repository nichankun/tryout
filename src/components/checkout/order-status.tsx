"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrderStatusValue = "pending" | "paid" | "failed";

interface OrderState {
  id: string;
  status: OrderStatusValue;
  amount: number;
  paidAt: string | null;
  packageTitle: string;
}

interface OrderStatusProps {
  orderId: string;
  packageId: number;
  initialOrder: OrderState;
}

const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function OrderStatus({ orderId, packageId, initialOrder }: OrderStatusProps) {
  const [order, setOrder] = useState(initialOrder);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Status pembayaran belum dapat diperiksa.");
      setOrder(await response.json() as OrderState);
      setError(null);
    } catch {
      setError("Status belum dapat diperbarui. Coba periksa lagi beberapa saat lagi.");
    } finally {
      setIsChecking(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (order.status !== "pending") return;
    const interval = window.setInterval(() => void checkStatus(), 5000);
    return () => window.clearInterval(interval);
  }, [checkStatus, order.status]);

  const isPaid = order.status === "paid";
  const isFailed = order.status === "failed";

  return (
    <Card className="mx-auto w-full max-w-xl border-border shadow-sm">
      <CardHeader className="text-center">
        <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : isFailed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
          {isPaid ? <CheckCircle2 className="h-7 w-7" /> : isFailed ? <AlertCircle className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
        </div>
        <CardTitle>{isPaid ? "Pembayaran berhasil" : isFailed ? "Pembayaran belum berhasil" : "Menunggu konfirmasi pembayaran"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isPaid
            ? "Akses paket sudah dibuka untuk akun kamu."
            : isFailed
              ? "Transaksi gagal atau kedaluwarsa. Kamu dapat mencoba checkout lagi."
              : "Halaman ini akan memperbarui status secara otomatis setelah Midtrans mengonfirmasi transaksi."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Paket</dt><dd className="text-right font-medium">{order.packageTitle}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nominal</dt><dd className="font-semibold">{formatter.format(order.amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Order ID</dt><dd className="font-mono text-xs">{order.id}</dd></div>
        </dl>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          {isPaid ? (
            <Button asChild className="flex-1"><Link href={`/tryout/${packageId}`}>Mulai tryout</Link></Button>
          ) : isFailed ? (
            <Button asChild className="flex-1"><Link href={`/checkout/${packageId}`}>Coba bayar lagi</Link></Button>
          ) : (
            <Button onClick={() => void checkStatus()} disabled={isChecking} variant="outline" className="flex-1">
              {isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Periksa status
            </Button>
          )}
          <Button asChild variant="ghost" className="flex-1"><Link href="/dashboard">Kembali ke daftar paket</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
