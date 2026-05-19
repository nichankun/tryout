"use client";

/**
 * components/dashboard/tryout-grid.tsx
 * * Client Component Grid Volume Ujian.
 * Dioptimalkan dengan useDeferredValue untuk pencarian anti-lag, 
 * Memoization tingkat komponen, dan Caching Intl Formatter.
 */

import { useState, useDeferredValue, useMemo, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, FileText, Lock, Search, Zap } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI 
// ==========================================
const INT_CONFIG = {
  locale: "id-ID",
  currency: "IDR",
} as const;

const ROUTES = {
  tryout: "/tryout",
  checkout: "/checkout",
} as const;

const TEXT_CONTENT = {
  searchPlaceholder: "Cari volume...",
  noMatch: "Tidak ada volume yang cocok dengan",
  volumeLabel: "Volume",
  unlockedStatus: "Sudah diaktifkan",
  availableBadge: "Tersedia",
  actionStart: "Mulai Kerjakan",
  actionBuy: "Beli Sekarang",
  actionFree: "Akses Gratis",
  unitMinutes: "Menit",
  unitQuestions: "Soal",
} as const;

export interface TryoutVolume {
  id: number;
  title: string;
  totalSoal: number;
  durasiMenit: number;
  harga: number;
  hargaAsli: number;
  isUnlocked: boolean;
  isAvailable: boolean;
}

// OPTIMASI: Cache instance Intl.NumberFormat di luar komponen.
// Membuat instance ini di dalam render loop sangat mahal secara komputasi.
const currencyFormatter = new Intl.NumberFormat(INT_CONFIG.locale, {
  style: "currency",
  currency: INT_CONFIG.currency,
  minimumFractionDigits: 0,
});

function formatRupiah(n: number): string {
  return currencyFormatter.format(n);
}

// ==========================================
// SUB-KOMPONEN: KARTU VOLUME (DI-MEMOISASI)
// ==========================================
// OPTIMASI: React.memo mencegah Card re-render saat user mengetik di search bar 
// jika data props 'vol' pada card tersebut tidak berubah.
const VolumeCard = memo(function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");

  return (
    <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col p-0 gap-0">
      <CardHeader
        className={`h-32 flex items-center justify-center relative p-0 rounded-t-xl
          ${
            vol.isUnlocked
              ? "bg-linear-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700"
              : vol.harga === 0
                ? "bg-linear-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700"
                : "bg-linear-to-br from-primary to-primary/70"
          }`}
      >
        <span
          className="text-white/20 font-black text-6xl absolute left-4 top-1 select-none leading-none"
          aria-hidden
        >
          {paddedId}
        </span>
        <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-white text-xs font-bold z-10">
          {TEXT_CONTENT.volumeLabel} {paddedId}
        </div>

        {/* Icon kunci hanya untuk paket berbayar yang belum dimiliki */}
        {!vol.isUnlocked && vol.harga > 0 && (
          <div className="absolute top-3 right-3">
            <Lock className="w-4 h-4 text-white/60" />
          </div>
        )}

        {/* Badge GRATIS untuk paket harga 0 yang belum dimiliki */}
        {!vol.isUnlocked && vol.harga === 0 && (
          <div className="absolute top-3 right-3 bg-white/20 px-2 py-0.5 rounded-full">
            <span className="text-white text-[10px] font-bold">GRATIS</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col grow">
        <h3 className="font-bold text-foreground text-base mb-2 leading-tight">
          {vol.title}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {vol.isUnlocked ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
              <Zap className="w-3 h-3 mr-1" aria-hidden />
              {TEXT_CONTENT.availableBadge}
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
                <Clock className="w-3 h-3" aria-hidden />
                {vol.durasiMenit} {TEXT_CONTENT.unitMinutes}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
                <FileText className="w-3 h-3" aria-hidden />
                {vol.totalSoal} {TEXT_CONTENT.unitQuestions}
              </Badge>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0 flex items-center justify-between mt-auto">
        {vol.isUnlocked ? (
          <>
            <span className="text-xs text-muted-foreground italic">
              {TEXT_CONTENT.unlockedStatus}
            </span>
            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold border-0"
            >
              {/* @ts-ignore - Menghindari error TS jika router custom tidak support attribute ini */}
              <Link href={`${ROUTES.tryout}/${vol.id}`} transitionTypes={["slide"]}>
                {TEXT_CONTENT.actionStart}
              </Link>
            </Button>
          </>
        ) : vol.harga === 0 ? (
          <Button
            asChild
            size="sm"
            className="rounded-lg font-bold w-full bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            <Link href={`${ROUTES.checkout}/${vol.id}`}>
              {TEXT_CONTENT.actionFree}
            </Link>
          </Button>
        ) : (
          <>
            <div>
              <p className="text-[10px] text-muted-foreground line-through leading-none mb-0.5">
                {formatRupiah(vol.hargaAsli)}
              </p>
              <p className="text-primary font-bold text-sm leading-none">
                {formatRupiah(vol.harga)}
              </p>
            </div>
            <Button asChild size="sm" className="rounded-lg font-bold">
              <Link href={`${ROUTES.checkout}/${vol.id}`}>
                {TEXT_CONTENT.actionBuy}
              </Link>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
});

// ==========================================
// KOMPONEN UTAMA GRID
// ==========================================
export function TryoutGrid({ volumes }: { volumes: TryoutVolume[] }) {
  const [query, setQuery] = useState("");
  
  // OPTIMASI: Memisahkan state input yang butuh respon instan dengan logika filter yang berat
  const deferredQuery = useDeferredValue(query);

  // OPTIMASI: Filter hanya berjalan ulang jika deferredQuery atau daftar volumes berubah
  const filtered = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase();
    return volumes.filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.id.toString().includes(lowerQuery)
    );
  }, [deferredQuery, volumes]);

  return (
    <div className="space-y-6">
      <div className="relative w-full md:w-80">
        <Input
          type="search"
          placeholder={TEXT_CONTENT.searchPlaceholder}
          value={query} // Input tetap membaca nilai real-time (tanpa lag)
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl transition-all"
          aria-label="Cari volume tryout"
        />
        <Search
          className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors 
            ${query !== deferredQuery ? "text-primary animate-pulse" : "text-muted-foreground"}`}
          aria-hidden
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
          <p className="font-medium">
            {TEXT_CONTENT.noMatch} "{deferredQuery}"
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>
    </div>
  );
}