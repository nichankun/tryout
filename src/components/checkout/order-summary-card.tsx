"use client";

/**
 * components/checkout/order-summary-card.tsx
 * 
 * Komponen ringkasan pesanan belanja di sidebar kanan checkout.
 * Menggunakan token warna semantik agar adaptif terhadap perubahan tema (mode gelap/terang).
 */

import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  locale: "id-ID",
} as const;

const TEXT_CONTENT = {
  title: "Ringkasan Belanja",
  labelPrice: "Harga Paket",
  labelAdminFee: "Biaya Layanan",
  labelTotal: "Total Pembayaran",
  securePaymentHint: "Pembayaran aman & terenkripsi. Akses tryout terbuka otomatis setelah pembayaran berhasil.",
} as const;

interface OrderSummaryCardProps {
  tryoutName: string;
  price: number;
  adminFee: number;
  total: number;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function OrderSummaryCard({ tryoutName, price, adminFee, total }: OrderSummaryCardProps) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm sticky top-8">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">
          {TEXT_CONTENT.title}
        </h2>

        {/* Blok Informasi Nama Paket */}
        <div className="bg-primary/5 px-4 py-3 rounded-xl border border-primary/10">
          <p className="text-sm font-semibold text-primary leading-snug">
            {tryoutName}
          </p>
        </div>

        {/* Detail Perhitungan Rincian Harga */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{TEXT_CONTENT.labelPrice}</span>
            <span>Rp {price.toLocaleString(APP_CONFIG.locale)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{TEXT_CONTENT.labelAdminFee}</span>
            <span>Rp {adminFee.toLocaleString(APP_CONFIG.locale)}</span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between font-bold text-base text-foreground">
            <span>{TEXT_CONTENT.labelTotal}</span>
            <span className="text-primary font-black">
              Rp {total.toLocaleString(APP_CONFIG.locale)}
            </span>
          </div>
        </div>

        {/* Indikator Spanduk Keamanan Transaksi */}
        <div className="flex items-start gap-2 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {TEXT_CONTENT.securePaymentHint}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}