/**
 * app/tryout/[id]/pembahasan/loading.tsx
 * 
 * Loading Skeleton Halaman Pembahasan Tryout (Next.js Suspense Engine).
 * Ditampilkan secara otomatis sebagai fallback layout interaktif sewaktu halaman review 
 * analisis hasil dan pembahasan kunci jawaban (`page.tsx`) sedang memuat data dari database.
 */

import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SKELETON_CONFIG = {
  statCardsCount: 3,     // Jumlah kartu metrik ringkasan nilai/skor subtest (TWK, TIU, TKP)
  questionCardsCount: 3, // Jumlah placeholder container pembahasan soal yang di-render awal
  optionsCount: 4,       // Jumlah baris opsi pilihan jawaban per nomor soal
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function PembahasanLoading() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8 text-foreground antialiased">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 1. TOP UTILITY ACTIONS BAR */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36 rounded-xl" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>

        {/* 2. TITLE SECTION SKELETON */}
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-40" />
        </div>

        {/* 3. KARTU METRIK STATISTIK RINGKASAN SUBTEST */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: SKELETON_CONFIG.statCardsCount }).map((_, i) => (
            <Skeleton key={`stat-card-${i}`} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* 4. LISTING BLOK KARTU SOAL & PEMBAHASAN DETAIL */}
        {Array.from({ length: SKELETON_CONFIG.questionCardsCount }).map((_, i) => (
          <div 
            key={`question-card-${i}`} 
            className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
          >
            {/* Header Bagian Atas Kartu Pembahasan Soal */}
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <Skeleton className="h-5 w-48" />
            </div>
            
            {/* Area List Baris Pilihan Jawaban */}
            <div className="p-4 space-y-3">
              {Array.from({ length: SKELETON_CONFIG.optionsCount }).map((_, j) => (
                <Skeleton key={`option-${i}-${j}`} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
        
      </div>
    </div>
  );
}