/**
 * app/checkout/[id]/loading.tsx
 * 
 * Loading Skeleton Page Component (Next.js Suspense Engine).
 * Ditampilkan secara otomatis sebagai fallback layout interaktif selama proses 
 * rendering asynchronous data transaksi checkout berlangsung di sisi server.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8 text-foreground antialiased">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── SECTION A: HEADER PANEL SKELETON ── */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>

        {/* Grid Pembagian Layout Utama */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* ── SECTION B: SISI KIRI (Detail Informasi & Metode) ── */}
          <div className="md:col-span-3 space-y-6">
            
            {/* Blok Informasi Paket */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <div className="space-y-2.5 pt-1">
                <Skeleton className="h-4 w-36" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={`line-${i}`} className="h-5 w-full" />
                ))}
              </div>
            </div>
            
            {/* Blok Opsi Saluran Pembayaran (Channels) */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`channel-${i}`} className="h-20 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>

          {/* ── SECTION C: SISI KANAN (Rincian Ringkasan Belanja) ── */}
          <div className="md:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm position-sticky top-6">
              <Skeleton className="h-6 w-36" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                
                {/* Garis Pembatas Semantik Devider */}
                <div className="h-px w-full bg-border/60 my-1" />
                
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              
              <Skeleton className="h-10 w-full rounded-xl mt-2" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}