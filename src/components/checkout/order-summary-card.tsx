"use client";

/**
 * components/checkout/order-summary-card.tsx
 * Server Component — ringkasan pesanan di sidebar kanan checkout
 * ✅ Sticky di desktop
 * ✅ shadcn/ui: Card, CardContent
 */

import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

interface OrderSummaryCardProps {
  tryoutName: string;
  price: number;
  adminFee: number;
  total: number;
}

export function OrderSummaryCard({ tryoutName, price, adminFee, total }: OrderSummaryCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Ringkasan Belanja
        </h2>

        {/* Nama paket */}
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-800">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 leading-snug">
            {tryoutName}
          </p>
        </div>

        {/* Rincian harga */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Harga Paket</span>
            <span>Rp {price.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Biaya Layanan</span>
            <span>Rp {adminFee.toLocaleString("id-ID")}</span>
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
          <div className="flex justify-between font-bold text-base text-slate-800 dark:text-slate-100">
            <span>Total Pembayaran</span>
            <span className="text-blue-600 dark:text-blue-400">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Badge aman */}
        <div className="flex items-center gap-2 pt-1">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" aria-hidden />
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Pembayaran aman & terenkripsi. Akses tryout terbuka otomatis setelah pembayaran berhasil.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}