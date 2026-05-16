/**
 * app/tryout/[id]/loading.tsx
 *
 * ✅ Skeleton untuk halaman pengerjaan soal
 * ✅ Tampil otomatis selagi page.tsx mengambil data soal dari server
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function TryoutLoading() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">

      {/* Header skeleton */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 h-16 px-4 sticky top-0 z-50">
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

      {/* Main layout */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Panel soal skeleton */}
        <div className="lg:col-span-8 space-y-4">
          {/* Progress bar */}
          <Skeleton className="h-2 w-full rounded-full" />

          {/* Card soal */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Card header */}
            <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Teks soal */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>

              {/* Pilihan jawaban */}
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>

            {/* Card footer */}
            <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Panel navigasi skeleton */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <Skeleton className="h-5 w-32" />
            {/* Status grid */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            {/* Nomor soal grid */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}