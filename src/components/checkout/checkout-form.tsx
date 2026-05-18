"use client";

/**
 * components/checkout/checkout-form.tsx
 * 
 * Komponen Client Gabungan: Penanganan Pilihan Metode Pembayaran,
 * Validasi Form Invoice, dan Integrasi Gateway Popup Midtrans Snap.
 */

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck, QrCode, CreditCard, Wallet } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
type PaymentMethod = "qris" | "transfer" | "ewallet";

const API_ROUTES = {
  paymentEndpoint: "/api/payment",
  termsAndConditions: "/syarat-ketentuan",
  confirmationRedirect: (volId: number, orderId: string) => `/checkout/${volId}/konfirmasi?orderId=${orderId}`,
} as const;

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

const TEXT_CONTENT = {
  paymentSectionTitle: "Metode Pembayaran",
  invoiceSectionTitle: "Data untuk Invoice",
  labelName: "Nama Lengkap",
  placeholderName: "Budi Santoso",
  labelEmail: "Email",
  placeholderEmail: "nama@email.com",
  labelPhone: "Nomor HP",
  phoneOptionalHint: "(opsional, untuk notifikasi WhatsApp)",
  placeholderPhone: "08123456789",
  btnProcessing: "Memproses...",
  btnPayPrefix: "Bayar",
  termsAgreementPrefix: "Dengan menekan tombol ini, kamu menyetujui",
  termsLinkText: "Syarat & Ketentuan",
  termsAgreementSuffix: "ASNPedia.",
  fallbackError: "Terjadi kesalahan. Coba beberapa saat lagi.",
  networkError: "Terjadi kesalahan jaringan. Periksa koneksi kamu.",
  midtransError: "Pembayaran gagal. Coba lagi.",
  validationName: "Nama minimal 2 karakter.",
  validationEmail: "Format email tidak valid.",
  validationPhone: "Format nomor HP tidak valid. Contoh: 08123456789",
} as const;

interface CheckoutFormProps {
  volumeId: number;
  total: number;
}

// ==========================================
// UTALITAS VALIDASI FORMULIR
// ==========================================
function validateFields(name: string, email: string, phone: string) {
  const errors: Record<string, string> = {};
  if (name.trim().length < 2) errors.name = TEXT_CONTENT.validationName;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = TEXT_CONTENT.validationEmail;
  if (phone && !/^(\+62|08)\d{8,12}$/.test(phone)) errors.phone = TEXT_CONTENT.validationPhone;
  return errors;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
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

  async function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});

    const name  = formData.get("name")  as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const errors = validateFields(name, email, phone);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(API_ROUTES.paymentEndpoint, {
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
        setError(SAFE_ERRORS[result.error] ?? TEXT_CONTENT.fallbackError);
        return;
      }

      // Integrasi Pemicu Jendela Popup Midtrans Snap SDK
      if (result.snapToken && window.snap) {
        window.snap.pay(result.snapToken, {
          onSuccess: () => router.push(API_ROUTES.confirmationRedirect(volumeId, result.orderId)),
          onPending: () => router.push(API_ROUTES.confirmationRedirect(volumeId, result.orderId)),
          onError:   () => setError(TEXT_CONTENT.midtransError),
          onClose:   () => setIsLoading(false),
        });
        return;
      }

      // Fallback tanpa Snap SDK (Direct routing redirection)
      router.push(API_ROUTES.confirmationRedirect(volumeId, result.orderId));
      router.refresh();
    } catch {
      setError(TEXT_CONTENT.networkError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* SEKSI PILIHAN KARTU METODE PEMBAYARAN */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            {TEXT_CONTENT.paymentSectionTitle}
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
                  className={`flex flex-col items-center py-4 gap-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    ${isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30"
                    }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SEKSI SUBMIT DATA DIRI INVOICE */}
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {TEXT_CONTENT.invoiceSectionTitle}
          </h2>

          <form action={handleSubmit} className="space-y-4" noValidate>

            {/* Input Komponen: Nama */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{TEXT_CONTENT.labelName}</Label>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                placeholder={TEXT_CONTENT.placeholderName}
                autoComplete="name"
                required
                disabled={isLoading}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {fieldErrors.name && (
                <p id="name-error" role="alert" className="text-xs text-destructive font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Input Komponen: Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">{TEXT_CONTENT.labelEmail}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={TEXT_CONTENT.placeholderEmail}
                autoComplete="email"
                required
                disabled={isLoading}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="text-xs text-destructive font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Input Komponen: Nomor HP */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                {TEXT_CONTENT.labelPhone}{" "}
                <span className="text-muted-foreground font-normal text-xs">{TEXT_CONTENT.phoneOptionalHint}</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder={TEXT_CONTENT.placeholderPhone}
                autoComplete="tel"
                disabled={isLoading}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                className={`h-11 rounded-xl ${fieldErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {fieldErrors.phone && (
                <p id="phone-error" role="alert" className="text-xs text-destructive font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Blok Tampilan Peringatan Error Global */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl font-medium"
              >
                {error}
              </div>
            )}

            {/* Tombol Eksekusi Aksi Transaksi Utama */}
            <Button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full h-12 text-base font-bold rounded-xl gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  {TEXT_CONTENT.btnProcessing}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" aria-hidden />
                  {TEXT_CONTENT.btnPayPrefix} {total.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                </>
              )}
            </Button>

            {/* Teks Informasi Hukum / Persetujuan Aturan */}
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              {TEXT_CONTENT.termsAgreementPrefix}{" "}
              <Link
                href={API_ROUTES.termsAndConditions}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {TEXT_CONTENT.termsLinkText}
              </Link>{" "}
              {TEXT_CONTENT.termsAgreementSuffix}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Deklarasi Type Global Objek Properti Midtrans Snap SDK Window
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