/**
 * app/dashboard/loading.tsx
 *
 * ✅ Next.js 16 App Router: file loading.tsx otomatis ditampilkan saat
 *    page.tsx masih streaming / menunggu data (Suspense boundary otomatis)
 * ✅ Server Component — tidak perlu "use client"
 * ✅ Pakai shadcn Skeleton untuk efek shimmer
 *
 * 📦 Install: npx shadcn@latest add skeleton
 */

import { Skeleton } from "@/components/ui/skeleton";

// ── Skeleton satu card volume ──
function VolumeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Header gradient area */}
      <Skeleton className="h-32 w-full rounded-none" />
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

export default function DashboardLoading() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">

      {/* Navbar skeleton */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 h-16 px-4">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="bg-blue-600/20 dark:bg-blue-900/20 py-14 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-10 w-80 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded" />
          <Skeleton className="h-10 w-48 rounded-full mt-2" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-64 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <VolumeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}