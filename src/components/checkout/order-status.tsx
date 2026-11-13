"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrderStatusValue = "pending" | "paid" | "failed" | "partially_refunded" | "refunded" | "disputed";

interface OrderState {
  id: string;
  status: OrderStatusValue;
  amount: number;
  paidAt: string | null;
  reconciliationRequired: boolean;
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

  const refreshStatus = useCallback(async (syncMidtrans = false) => {
    try {
      const syncQuery = syncMidtrans ? "?sync=1" : "";
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}${syncQuery}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Status pembayaran belum dapat diperiksa.");
      setOrder(await response.json() as OrderState);
      setError(null);
    } catch {
      setError("Status belum dapat diperbarui. Coba periksa lagi beberapa saat lagi.");
    }
  }, [orderId]);

  const checkStatus = useCallback(async (syncMidtrans = false) => {
    setIsChecking(true);
    try {
      await refreshStatus(syncMidtrans);
    } finally {
      setIsChecking(false);
    }
  }, [refreshStatus]);

  useEffect(() => {
    if (order.status !== "pending" && !order.reconciliationRequired) return;
    const initialCheck = window.setTimeout(() => void refreshStatus(true), 0);
    let pollCount = 0;
    const interval = window.setInterval(() => {
      pollCount += 1;
      void refreshStatus(pollCount % 6 === 0);
    }, 5000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [refreshStatus, order.status, order.reconciliationRequired]);

  const isPaid = order.status === "paid";
  const hasAccess = isPaid || order.status === "partially_refunded";
  const isReconciling = order.reconciliationRequired;
  const isFailed = (order.status === "failed" && !isReconciling) || order.status === "refunded";
  const isDisputed = order.status === "disputed";
  const isClosed = isFailed || isDisputed;
  const statusTitle = isReconciling
    ? "Memastikan status pembayaran"
    : isPaid
    ? "Pembayaran berhasil"
    : order.status === "partially_refunded"
      ? "Pembayaran dikembalikan sebagian"
      : order.status === "refunded"
        ? "Pembayaran dikembalikan"
        : isDisputed
          ? "Pembayaran sedang ditinjau"
          : isFailed
            ? "Pembayaran belum berhasil"
            : "Menunggu konfirmasi pembayaran";
  const statusDescription = isReconciling
    ? "Midtrans masih melaporkan transaksi ini dalam proses. Kami sedang mencocokkan statusnya sebelum kamu mencoba membayar lagi."
    : hasAccess
    ? order.status === "partially_refunded"
      ? "Akses paket tetap tersedia setelah pengembalian sebagian."
      : "Akses paket sudah dibuka untuk akun kamu."
    : order.status === "refunded"
      ? "Akses paket dihentikan karena pembayaran dikembalikan. Kamu dapat membeli paket lagi jika diperlukan."
      : isDisputed
        ? "Akses paket dihentikan sementara selama status pembayaran ditinjau. Hubungi bantuan jika kamu merasa ini keliru."
        : isFailed
          ? "Transaksi gagal atau kedaluwarsa. Kamu dapat mencoba checkout lagi."
          : "Halaman ini akan memperbarui status secara otomatis setelah Midtrans mengonfirmasi transaksi.";

  return (
    <Card className="mx-auto w-full max-w-xl border-border shadow-sm">
      <CardHeader className="text-center">
        <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full ${hasAccess ? "bg-emerald-100 text-emerald-700" : isClosed ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
          {hasAccess ? <CheckCircle2 className="h-7 w-7" /> : isClosed ? <AlertCircle className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
        </div>
        <CardTitle>{statusTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{statusDescription}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Paket</dt><dd className="text-right font-medium">{order.packageTitle}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nominal</dt><dd className="font-semibold">{formatter.format(order.amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Order ID</dt><dd className="font-mono text-xs">{order.id}</dd></div>
        </dl>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          {hasAccess ? (
            <Button asChild className="flex-1"><Link href={`/tryout/${packageId}`}>Mulai tryout</Link></Button>
          ) : isFailed ? (
            <Button asChild className="flex-1"><Link href={`/checkout/${packageId}`}>Coba bayar lagi</Link></Button>
          ) : isDisputed ? (
            <Button asChild variant="outline" className="flex-1"><Link href="/bantuan">Hubungi bantuan</Link></Button>
          ) : (
            <Button onClick={() => void checkStatus(true)} disabled={isChecking} variant="outline" className="flex-1">
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
