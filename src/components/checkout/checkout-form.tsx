"use client";

/**
 * components/checkout/checkout-form.tsx — MERGED
 *
 * Menggabungkan:
 * - checkout-panel.tsx  (state metode pembayaran)
 * - checkout-button.tsx (aksi bayar)
 * - checkout-form.tsx   (form data diri + Midtrans Snap)
 *
 * Fix yang diterapkan:
 * [1] <a href> → <Link> untuk navigasi internal
 * [2] onSubmit + e.preventDefault() → action={handleSubmit} konsisten dengan LoginForm & RegisterForm
 */

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, QrCode, CreditCard, Wallet } from "lucide-react";

type PaymentMethod = "qris" | "transfer" | "ewallet";

interface CheckoutFormProps {
  volumeId: number;
  total: number;
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { key: "qris",     label: "QRIS",         icon: QrCode     },
  { key: "transfer", label: "Transfer Bank", icon: CreditCard },
  { key: "ewallet",  label: "E-Wallet",      icon: Wallet     },
];

const SAFE_ERRORS: Record<string, string> = {
  UNAUTHORIZED:   "Kamu harus login terlebih dahulu.",
  ALREADY_OWNED:  "Kamu sudah memiliki volume ini.",
  INVALID_VOLUME: "Volume tidak valid.",
  PAYMENT_FAILED: "Pembayaran gagal. Coba lagi.",
  INVALID_PHONE:  "Nomor HP tidak valid.",
};

function validate(name: string, email: string, phone: string) {
  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = "Nama minimal 2 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Format email tidak valid.";
  if (phone && !/^(\+62|08)\d{8,12}$/.test(phone))
    errors.phone = "Format nomor HP tidak valid. Contoh: 08123456789";
  return errors;
}

export function CheckoutForm({ volumeId, total }: CheckoutFormProps) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("qris");
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]       = useState<Record<string, string>>({});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ✅ [FIX 2] action={handleSubmit} — konsisten dengan LoginForm & RegisterForm
  async function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});

    const name  = formData.get("name")  as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const errors = validate(name, email, phone);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volumeId,
          paymentMethod: selectedMethod,
          name,
          email,
          phone,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setError(SAFE_ERRORS[result.error] ?? "Terjadi kesalahan. Coba beberapa saat lagi.");
        return;
      }

      // Midtrans Snap popup
      if (result.snapToken && window.snap) {
        window.snap.pay(result.snapToken, {
          onSuccess: () => router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`),
          onPending: () => router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`),
          onError:   () => setError("Pembayaran gagal. Coba lagi."),
          onClose:   () => setIsLoading(false),
        });
        return;
      }

      // Fallback tanpa Snap
      router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Periksa koneksi kamu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Pilihan Metode Pembayaran */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Metode Pembayaran
          </h2>
          <div
            className="grid grid-cols-3 gap-3"
            role="radiogroup"
            aria-label="Pilih metode pembayaran"
          >
            {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => {
              const isActive = selectedMethod === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelectedMethod(key)}
                  className={`flex flex-col items-center py-4 gap-2 rounded-xl border text-xs font-semibold transition-all
                    ${isActive
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Data Diri */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            Data untuk Invoice
          </h2>

          {/* ✅ [FIX 2] action={handleSubmit} bukan onSubmit */}
          <form action={handleSubmit} className="space-y-4" noValidate>

            {/* Nama */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                placeholder="Budi Santoso"
                autoComplete="name"
                required
                disabled={isLoading}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.name && (
                <p id="name-error" role="alert" className="text-xs text-red-500">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                autoComplete="email"
                required
                disabled={isLoading}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* No HP */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Nomor HP{" "}
                <span className="text-slate-400 font-normal text-xs">(opsional, untuk notifikasi WhatsApp)</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="08123456789"
                autoComplete="tel"
                disabled={isLoading}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="text-xs text-red-500">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Error global */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 rounded-xl"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full h-12 text-base font-bold rounded-xl gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" aria-hidden />
                  Bayar Rp {total.toLocaleString("id-ID")}
                </>
              )}
            </Button>

            {/* ✅ [FIX 1] <a> → <Link> */}
            <p className="text-xs text-center text-slate-400 dark:text-slate-500">
              Dengan menekan tombol ini, kamu menyetujui{" "}
              <Link
                href="/syarat-ketentuan"
                className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Syarat & Ketentuan
              </Link>{" "}
              ASNPedia.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Type global untuk Midtrans Snap
declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess: () => void;
          onPending: () => void;
          onError:   () => void;
          onClose:   () => void;
        }
      ) => void;
    };
  }
}