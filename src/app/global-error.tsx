"use client";

/**
 * app/global-error.tsx
 *
 * ✅ Menangkap error yang terjadi di app/layout.tsx (root layout)
 * ✅ Berbeda dari error.tsx — ini merender ULANG seluruh UI termasuk <html> dan <body>
 * ✅ Wajib ada di Next.js 16 untuk error handling yang lengkap
 *
 * ⚠️  Karena ini merender ulang root, ia TIDAK bisa pakai komponen dari layout
 *     (Navbar, dll tidak tersedia). Desain harus self-contained.
 */

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    // ✅ Wajib render <html> dan <body> sendiri di global-error
    <html lang="id">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center px-4 font-sans">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="text-5xl font-black text-slate-200 select-none">!</div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-slate-800">
              ASNPedia mengalami gangguan
            </h1>
            <p className="text-sm text-slate-500">
              Terjadi kesalahan kritis. Silakan muat ulang halaman.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 font-mono pt-1">
                ID: {error.digest}
              </p>
            )}
          </div>
          <Button onClick={reset} className="gap-2 w-full">
            <RotateCcw className="w-4 h-4" aria-hidden />
            Muat Ulang
          </Button>
        </div>
      </body>
    </html>
  );
}