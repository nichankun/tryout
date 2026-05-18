/**
 * app/tryout/[id]/loading.tsx
 * 
 * Loading Skeleton Halaman Pengerjaan Ujian Simulasi CAT (Next.js Suspense Boundary).
 * Ditampilkan secara otomatis sebagai fallback layout interaktif sewaktu komponen halaman utama
 * (`page.tsx`) sedang melakukan streaming data bank soal dari database server.
 */

import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SKELETON_CONFIG = {
  optionsCount: 5,       // Jumlah opsi pilihan ganda lembar jawaban (A-E)
  statusGridCount: 3,    // Ringkasan indikator kategori status soal (Belum, Ragu, Sudah)
  questionGridCount: 30, // Representasi placeholder jumlah kotak navigasi nomor soal
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function TryoutLoading() {
  return (
    <div className="bg-background min-h-screen text-foreground antialiased">

      {/* 1. SKELETON PANEL HEADER (STICKY INTERFACE NAVBAR) */}
      <div className="bg-card border-b border-border h-16 px-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-10 rounded-lg" />
            <Skeleton className="h-5 w-48 hidden sm:block" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* 2. MAIN GRID LAYOUT SYSTEM CONTAINER */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── PANEL SISI KIRI: KONTEN LEMBAR SOAL & JAWABAN ── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Batang Indikator Kemajuan Sesi (Progress Bar) */}
          <Skeleton className="h-2 w-full rounded-full" />

          {/* Main Card Soal Container */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Sub-Header Card Informasi Nomor & Kategori */}
            <div className="bg-muted/40 px-5 py-3 border-b border-border flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Paragraf Narasi Teks Soal */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>

              {/* Kelompok Shimmer Baris Opsi Pilihan Ganda */}
              <div className="space-y-3">
                {Array.from({ length: SKELETON_CONFIG.optionsCount }).map((_, i) => (
                  <Skeleton key={`option-shimmer-${i}`} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>

            {/* Sub-Footer Card Panel Tombol Navigasi Kontrol (Sebelumnya, Ragu, Selanjutnya) */}
            <div className="bg-muted/40 px-5 py-3 border-t border-border flex justify-between items-center">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* ── PANEL SISI KANAN: NAVIGASI NOMOR MAP BOARD ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-4 shadow-sm">
            <Skeleton className="h-5 w-32" />
            
            {/* Papan Indikator Keterangan Status Mini */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: SKELETON_CONFIG.statusGridCount }).map((_, i) => (
                <Skeleton key={`status-shimmer-${i}`} className="h-16 rounded-lg" />
              ))}
            </div>
            
            {/* Peta Kisi Kotak Nomor Pilihan Navigasi */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: SKELETON_CONFIG.questionGridCount }).map((_, i) => (
                <Skeleton key={`num-shimmer-${i}`} className="h-9 rounded-lg" />
              ))}
            </div>
            
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          
          {/* Wadah Widget Informasi Ekstra Bawah */}
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>

      </div>
    </div>
  );
}