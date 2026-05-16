"use client";

/**
 * components/checkout/checkout-form.tsx
 * Client Component — form data diri untuk keperluan invoice/bukti pembayaran
 * ✅ Validasi client-side sebelum hit API route /api/payment
 * ✅ Loading & error state dengan try/catch/finally
 * ✅ React Compiler aktif — tidak perlu useCallback manual
 * ✅ autoFocus via useRef + useEffect
 * ✅ shadcn/ui: Input, Label, Button
 */

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

type PaymentMethod = "qris" | "transfer" | "ewallet";

interface CheckoutFormProps {
  volumeId: number;
  paymentMethod: PaymentMethod;
  total: number;
}

const SAFE_ERRORS: Record<string, string> = {
  UNAUTHORIZED: "Kamu harus login terlebih dahulu.",
  ALREADY_OWNED: "Kamu sudah memiliki volume ini.",
  INVALID_VOLUME: "Volume tidak valid.",
  PAYMENT_FAILED: "Pembayaran gagal. Coba lagi.",
  INVALID_PHONE: "Nomor HP tidak valid.",
};

export function CheckoutForm({ volumeId, paymentMethod, total }: CheckoutFormProps) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ✅ autoFocus setelah mount — lebih aman dari autoFocus prop
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function validate(name: string, email: string, phone: string) {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Nama minimal 2 karakter.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Format email tidak valid.";
    if (phone && !/^(\+62|08)\d{8,12}$/.test(phone))
      errors.phone = "Format nomor HP tidak valid. Contoh: 08123456789";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    // ✅ Validasi client-side dulu sebelum hit server
    const errors = validate(name, email, phone);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Hit API route — bukan Server Action karena lib/actions/checkout.ts tidak ada di list
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeId, paymentMethod, name, email, phone }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setError(SAFE_ERRORS[result.error] ?? "Terjadi kesalahan. Coba beberapa saat lagi.");
        return;
      }

      // ✅ Midtrans Snap — buka popup jika ada snapToken
      if (result.snapToken && window.snap) {
        window.snap.pay(result.snapToken, {
          onSuccess: () => router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`),
          onPending: () => router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`),
          onError: () => setError("Pembayaran gagal. Coba lagi."),
          onClose: () => setIsLoading(false),
        });
        return;
      }

      // ✅ Fallback: redirect langsung jika tidak pakai Snap
      router.push(`/checkout/${volumeId}/konfirmasi?orderId=${result.orderId}`);
    } catch {
      setError("Terjadi kesalahan jaringan. Periksa koneksi kamu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Nama Lengkap */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama Lengkap</Label>
        <Input
          ref={nameRef}
          id="name"
          name="name"
          placeholder="Budi Santoso"
          autoComplete="name"
          required
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {fieldErrors.name && (
          <p id="name-error" role="alert" className="text-xs text-red-500">
            {fieldErrors.name}
          </p>
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
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {fieldErrors.email && (
          <p id="email-error" role="alert" className="text-xs text-red-500">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* No HP (opsional) */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">
          Nomor HP{" "}
          <span className="text-slate-400 font-normal text-xs">
            (opsional, untuk notifikasi WhatsApp)
          </span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="08123456789"
          autoComplete="tel"
          aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          className={fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
        {fieldErrors.phone && (
          <p id="phone-error" role="alert" className="text-xs text-red-500">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      {/* Error global */}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg"
        >
          {error}
        </p>
      )}

      {/* Tombol Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            Memproses...
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 mr-2" aria-hidden />
            Bayar Rp {total.toLocaleString("id-ID")}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500">
        Dengan menekan tombol ini, kamu menyetujui{" "}
        <a
          href="/syarat-ketentuan"
          className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Syarat & Ketentuan
        </a>{" "}
        ASNPedia.
      </p>
    </form>
  );
}

// ✅ Type global untuk Midtrans Snap
declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess: () => void;
          onPending: () => void;
          onError: () => void;
          onClose: () => void;
        }
      ) => void;
    };
  }
}