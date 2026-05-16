"use client";

/**
 * app/error.tsx
 *
 * ✅ Error Boundary global Next.js 16 App Router
 * ✅ Wajib "use client" — Error boundaries harus Client Component
 * ✅ Menerima props `error` dan `reset` dari Next.js secara otomatis
 * ✅ `reset()` mencoba render ulang segmen yang error tanpa full reload
 *
 * Berlaku untuk semua route di bawah app/ kecuali yang punya error.tsx sendiri.
 * Untuk error di layout root, buat app/global-error.tsx (terpisah).
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string }; // digest = ID error unik dari Next.js (untuk logging)
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // ── Kirim error ke service monitoring (Sentry, Datadog, dll) ──
    // Contoh: Sentry.captureException(error);
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
        </div>

        {/* Pesan */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Terjadi Kesalahan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Halaman ini mengalami gangguan. Coba muat ulang, atau kembali ke
            dashboard jika masalah berlanjut.
          </p>

          {/* Tampilkan digest error untuk debugging (hanya development) */}
          {process.env.NODE_ENV === "development" && error.message && (
            <p className="mt-3 text-xs font-mono bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-left break-all">
              {error.message}
            </p>
          )}

          {error.digest && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            Coba Lagi
          </Button>

          <Button variant="outline" asChild>
            <Link href="/dashboard" className="gap-2">
              <Home className="w-4 h-4" aria-hidden />
              Ke Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}