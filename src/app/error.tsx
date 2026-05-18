"use client";

/**
 * app/error.tsx
 * 
 * Error Boundary Global Tingkat Aplikasi (Next.js App Router).
 * Menangkap runtime error tidak terduga pada seluruh segmen halaman di bawah root rute,
 * menyediakan mekanisme pemulihan state instan (reset) tanpa memicu reload halaman penuh.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const ROUTES = {
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  title: "Terjadi Kesalahan",
  description: "Halaman ini mengalami gangguan. Coba muat ulang, atau kembali ke dashboard jika masalah berlanjut.",
  btnRetry: "Coba Lagi",
  btnDashboard: "Ke Dashboard",
  errorPrefix: "Error ID:",
} as const;

interface ErrorPageProps {
  error: Error & { digest?: string }; // digest = ID enkripsi unik dari Next.js untuk kebutuhan crash log tracking
  reset: () => void;                 // Fungsi pemicu render ulang struktur segmen yang rusak
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Ruang integrasi layanan visualisasi monitoring eksternal (Sentry / Datadog / LogSnag)
    console.error("[CRASH LOG][App Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Blok Indikator Peringatan Visual (Icon) */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center animate-bounce">
            <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden />
          </div>
        </div>

        {/* Blok Informasi Deskripsi Pesan Masalah */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {TEXT_CONTENT.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {TEXT_CONTENT.description}
          </p>

          {/* Dump Tampilan Detail Informasi Teknis (Hanya Aktif di Mode Development) */}
          {process.env.NODE_ENV === "development" && error.message && (
            <p className="mt-3 text-xs font-mono bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-left break-all border border-destructive/20 select-all">
              {error.message}
            </p>
          )}

          {/* Penayangan Kode Enkripsi Identifikasi Pelacakan Log */}
          {error.digest && (
            <p className="text-xs text-muted-foreground/80 font-mono tracking-wider">
              {TEXT_CONTENT.errorPrefix} {error.digest}
            </p>
          )}
        </div>

        {/* Panel Kelompok Aksi Tombol Navigasi Alternatif */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            {TEXT_CONTENT.btnRetry}
          </Button>

          <Button variant="outline" asChild className="cursor-pointer">
            <Link href={ROUTES.dashboard} className="gap-2">
              <Home className="w-4 h-4" aria-hidden />
              {TEXT_CONTENT.btnDashboard}
            </Link>
          </Button>
        </div>
        
      </div>
    </div>
  );
}