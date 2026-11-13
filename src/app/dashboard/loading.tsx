/**
 * app/dashboard/loading.tsx
 * 
 * Loading Skeleton Dashboard Component (Next.js Suspense Engine).
 * Ditampilkan secara otomatis sebagai fallback layout interaktif ketika rute dashboard 
 * utama (`page.tsx`) sedang melakukan data streaming/fetching dari database di sisi server.
 */

import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SKELETON_CONFIG = {
  cardCount: 8,
} as const;

// ── Sub-Komponen: Skeleton Satu Item Paket Volume ──
function VolumeCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col shadow-sm">
      {/* Area Gambar Banner Atas */}
      <Skeleton className="h-32 w-full rounded-none" />
      
      {/* Area Detail Konten Card */}
      <div className="p-5 flex flex-col gap-3 grow">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        
        <div className="flex items-center justify-between mt-auto pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function DashboardLoading() {
  return (
    <>
      <div className="min-h-full bg-purple-50 md:hidden" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={`mobile-metric-${index}`} className="flex items-center gap-2.5 rounded-2xl border border-purple-100 bg-white px-2.5 py-3">
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            ))}
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-purple-100 bg-white px-3 py-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex min-h-[250px] flex-col justify-center gap-4 rounded-[1.35rem] border border-purple-200/80 bg-purple-100 px-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-11 w-40 rounded-xl" />
            </div>
            <div className="min-h-[220px] rounded-[1.35rem] border border-purple-100 bg-white p-5">
              <Skeleton className="h-6 w-36" />
              <div className="flex h-[150px] flex-col items-center justify-center gap-3">
                <Skeleton className="size-12 rounded-2xl" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden min-h-screen bg-background text-foreground antialiased md:block">

      {/* 1. SKELETON PANEL NAVBAR */}
      <div className="bg-card border-b border-border h-16 px-4">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* 2. SKELETON HERO BANNER SECTION */}
      <div className="bg-primary/10 py-14 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-10 w-80 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded" />
          <Skeleton className="h-10 w-48 rounded-full mt-2" />
        </div>
      </div>

      {/* 3. SKELETON GRID DAFTAR PAKET VOLUMES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Grid & Filter Skeletons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-64 rounded-xl self-start sm:self-auto" />
        </div>

        {/* Layout Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: SKELETON_CONFIG.cardCount }).map((_, i) => (
            <VolumeCardSkeleton key={`volume-skeleton-${i}`} />
          ))}
        </div>
        
      </div>
      </div>
    </>
  );
}
