/**
 * app/tryout/[id]/hasil/loading.tsx
 * 
 * Loading Skeleton Halaman Rekapitulasi Skor Hasil Tryout (Next.js Suspense Engine).
 * Ditampilkan secara otomatis sebagai fallback layout interaktif sewaktu komponen halaman utama
 * (`page.tsx`) sedang melakukan kalkulasi akhir dan mengambil log data riwayat dari database server.
 */

import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SKELETON_CONFIG = {
  statCardsCount: 3,   // Jumlah kartu penilaian subtest materi (TWK, TIU, TKP)
  tableRowsCount: 3,   // Jumlah baris summary data tabel pencapaian
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function HasilLoading() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8 text-foreground antialiased">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* 1. TOP UTILITY NAVIGATION ACTION */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>

        {/* 2. HERO BANNER INDICATOR SKELETON (Kelulusan / Skor Akhir) */}
        <Skeleton className="h-56 w-full rounded-2xl shadow-sm" />

        {/* 3. GRID KARTU DETAIL PEROLEHAN SKOR PER SUBTEST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: SKELETON_CONFIG.statCardsCount }).map((_, i) => (
            <div 
              key={`subtest-card-${i}`} 
              className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-6 w-14 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* 4. TABEL DATA ANALISIS CAPAIAN AMBANG BATAS */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Header Tabel */}
          <div className="p-5 border-b border-border bg-muted/10">
            <Skeleton className="h-6 w-40" />
          </div>
          
          {/* Isi Baris Kriteria Tabel */}
          <div className="p-4 space-y-3">
            {Array.from({ length: SKELETON_CONFIG.tableRowsCount }).map((_, i) => (
              <Skeleton key={`table-row-${i}`} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* 5. FOOTER BUTTON ACTIONS ACTION GROUP (Kembali / Pembahasan) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
          <Skeleton className="h-12 w-full sm:w-52 rounded-xl" />
          <Skeleton className="h-12 w-full sm:w-44 rounded-xl" />
        </div>

      </div>
    </div>
  );
}