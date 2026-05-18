/**
 * app/not-found.tsx
 * 
 * Halaman Server Component untuk Status HTTP 404.
 * Secara otomatis akan dirender oleh Next.js ketika pengguna mengakses rute yang tidak terdaftar,
 * atau ketika fungsi `notFound()` dari "next/navigation" dipanggil secara eksplisit di dalam halaman/layout.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  errorCode: "404",
  title: "Halaman Tidak Ditemukan",
  description: "Halaman yang kamu cari tidak ada atau sudah dipindahkan. Periksa kembali URL yang dimasukkan, atau kembali ke beranda utama.",
  btnDashboard: "Ke Dashboard",
  btnHome: "Beranda Utama",
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans antialiased">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Header Visual Angka 404 & Ikon Pendukung */}
        <div className="space-y-1">
          <p className="text-8xl font-black text-muted/30 select-none leading-none tracking-tighter">
            {TEXT_CONTENT.errorCode}
          </p>
          <div className="flex justify-center -mt-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
              <FileQuestion className="w-7 h-7 text-primary" aria-hidden />
            </div>
          </div>
        </div>

        {/* Area Teks Pesan Deskriptif */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {TEXT_CONTENT.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed px-2">
            {TEXT_CONTENT.description}
          </p>
        </div>

        {/* Grup Tombol Navigasi Alternatif Pengguna */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild className="gap-2 cursor-pointer shadow-sm">
            <Link href={ROUTES.dashboard}>
              <Home className="w-4 h-4" aria-hidden />
              {TEXT_CONTENT.btnDashboard}
            </Link>
          </Button>

          <Button variant="outline" asChild className="gap-2 cursor-pointer border-border">
            {/* Navigasi absolut lebih direkomendasikan pada Server Component ketimbang javascript:history.back() */}
            <Link href={ROUTES.home}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {TEXT_CONTENT.btnHome}
            </Link>
          </Button>
        </div>
        
      </div>
    </div>
  );
}