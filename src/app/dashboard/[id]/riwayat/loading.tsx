/**
 * app/riwayat/loading.tsx
 * 
 * Loading Skeleton Riwayat Component (Next.js Suspense Engine).
 * Ditampilkan secara otomatis sebagai fallback layout sewaktu halaman rekapitulasi 
 * riwayat ujian tryout (`page.tsx`) sedang melakukan streaming data dari database di sisi server.
 */

import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SKELETON_CONFIG = {
  statCardsCount: 4,
  historyRowsCount: 5,
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function RiwayatLoading() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8 text-foreground antialiased">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* 1. SKELETON HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl self-start sm:self-auto" />
        </div>

        {/* 2. SKELETON GRID KARTU STATISTIK OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_CONFIG.statCardsCount }).map((_, i) => (
            <Skeleton key={`stat-card-${i}`} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* 3. SKELETON TABEL / LIST REKAP RIWAYAT UTAMA */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Header Kontainer List */}
          <div className="px-5 py-3 border-b border-border">
            <Skeleton className="h-5 w-32" />
          </div>
          
          {/* Baris List Item Riwayat */}
          <div className="p-4 space-y-3">
            {Array.from({ length: SKELETON_CONFIG.historyRowsCount }).map((_, i) => (
              <Skeleton key={`history-row-${i}`} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}