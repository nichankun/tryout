"use client";

/**
 * components/checkout/checkout-panel.tsx
 * Client Component — mengelola state metode pembayaran yang dipilih
 * ✅ CheckoutButton diganti CheckoutForm (sesuai list komponen)
 * ✅ price & adminFee dipakai — tidak ada unused props
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, CreditCard, Wallet } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";

type PaymentMethod = "qris" | "transfer" | "ewallet";

const METHODS: { key: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { key: "qris",     label: "QRIS",         icon: QrCode     },
  { key: "transfer", label: "Transfer Bank", icon: CreditCard },
  { key: "ewallet",  label: "E-Wallet",      icon: Wallet     },
];

interface CheckoutPanelProps {
  volumeId: number;
  price: number;
  adminFee: number;
  total: number;
}

export function CheckoutPanel({ volumeId, price, adminFee, total }: CheckoutPanelProps) {
  const [selected, setSelected] = useState<PaymentMethod>("qris");

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Metode Pembayaran
        </h2>

        {/* Pilihan metode */}
        <div
          className="grid grid-cols-3 gap-3"
          role="radiogroup"
          aria-label="Pilih metode pembayaran"
        >
          {METHODS.map(({ key, label, icon: Icon }) => {
            const isActive = selected === key;
            return (
              <button
                key={key}
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelected(key)}
                className={`flex flex-col items-center py-4 gap-2 rounded-xl border text-xs font-semibold transition-all
                  ${isActive
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
              >
                <Icon
                  className={`w-6 h-6 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}
                  aria-hidden
                />
                {label}
              </button>
            );
          })}
        </div>

        {/* Rincian biaya */}
        <div className="text-sm space-y-1.5 pt-1">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Harga Paket</span>
            <span>Rp {price.toLocaleString("id-ID")}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Biaya Layanan</span>
            <span>Rp {adminFee.toLocaleString("id-ID")}</span>
          </div>
          <hr className="border-slate-100 dark:border-slate-800" />
          <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100">
            <span>Total</span>
            <span className="text-blue-600 dark:text-blue-400">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* ✅ Teruskan metode yang dipilih ke CheckoutForm */}
        <CheckoutForm
          volumeId={volumeId}
          paymentMethod={selected}
          total={total}
        />
      </CardContent>
    </Card>
  );
}