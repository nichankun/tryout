"use client";

/**
 * app/global-error.tsx
 * 
 * Error Boundary Tingkat Akar / Root (Next.js App Router).
 * Wajib merender tag <html> dan <body> sendiri karena komponen ini aktif saat 
 * terjadi crash kritis di dalam berkas app/layout.tsx utama.
 */

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  lang: "id",
} as const;

const TEXT_CONTENT = {
  title: "ASNPedia Mengalami Gangguan",
  description: "Terjadi kesalahan kritis pada sistem utama. Silakan coba muat ulang halaman.",
  btnRetry: "Muat Ulang Halaman",
  idPrefix: "ID:",
} as const;

interface GlobalErrorProps {
  error: Error & { digest?: string }; // ID enkripsi crash log dari Next.js runtime
  reset: () => void;                 // Fungsi pemulihan state / remount root component
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang={APP_CONFIG.lang}>
      <body className="min-h-screen bg-background flex items-center justify-center px-4 font-sans antialiased text-foreground">
        <div className="max-w-sm w-full text-center space-y-5">
          
          {/* Indikator Visual Simbol Peringatan Kritis */}
          <div className="text-6xl font-black text-muted/20 select-none tracking-tighter">
            !
          </div>

          {/* Deskripsi Informasi Masalah */}
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {TEXT_CONTENT.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {TEXT_CONTENT.description}
            </p>
            
            {/* Penayangan Token Digest Kode Identifikasi Masalah */}
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 font-mono pt-1 tracking-wider">
                {TEXT_CONTENT.idPrefix} {error.digest}
              </p>
            )}
          </div>

          {/* Tombol Eksekusi Aksi Pemulihan State */}
          <Button 
            onClick={reset} 
            className="gap-2 w-full cursor-pointer font-semibold shadow-sm"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            {TEXT_CONTENT.btnRetry}
          </Button>

        </div>
      </body>
    </html>
  );
}