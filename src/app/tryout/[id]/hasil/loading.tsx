/**
 * app/tryout/[id]/hasil/loading.tsx
 *
 * ✅ Ditampilkan otomatis saat hasil/page.tsx mengambil data dari server
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function HasilLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>

        {/* Banner */}
        <Skeleton className="h-56 w-full rounded-2xl" />

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-6 w-14 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Tabel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Tombol */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Skeleton className="h-12 w-52 rounded-xl" />
          <Skeleton className="h-12 w-44 rounded-xl" />
        </div>
      </div>
    </div>
  );
}