/**
 * app/not-found.tsx
 *
 * ✅ Server Component — tidak perlu "use client"
 * ✅ Otomatis ditampilkan saat notFound() dipanggil dari mana saja, atau URL tidak cocok
 * ✅ Gunakan notFound() dari "next/navigation" di page/layout manapun:
 *
 *   import { notFound } from "next/navigation";
 *   if (!volume) notFound(); // ← Next.js render halaman ini
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Angka 404 */}
        <div className="space-y-1">
          <p className="text-8xl font-black text-slate-100 dark:text-slate-800 select-none leading-none">
            404
          </p>
          <div className="flex justify-center -mt-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <FileQuestion className="w-7 h-7 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Pesan */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Halaman yang kamu cari tidak ada atau sudah dipindahkan. Periksa
            kembali URL, atau kembali ke dashboard.
          </p>
        </div>

        {/* Aksi */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/dashboard" className="gap-2">
              <Home className="w-4 h-4" aria-hidden />
              Ke Dashboard
            </Link>
          </Button>

          <Button variant="outline" asChild>
            {/* ✅ Pakai href="javascript:history.back()" tidak ideal di SSR,
                gunakan Link ke halaman sebelumnya yang diketahui */}
            <Link href="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}