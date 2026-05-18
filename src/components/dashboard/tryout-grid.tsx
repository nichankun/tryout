"use client";

/**
 * components/dashboard/tryout-grid.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, FileText, Lock, Search, Zap } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
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
  unitMinutes: "Menit",
  unitQuestions: "Soal",
} as const;

// ✅ Export tipe data agar selaras dengan halaman parent (page.tsx)
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

// Helper format mata uang
function formatRupiah(n: number): string {
  return new Intl.NumberFormat(INT_CONFIG.locale, {
    style: "currency",
    currency: INT_CONFIG.currency,
    minimumFractionDigits: 0,
  }).format(n);
}

// ==========================================
// SUB-KOMPONEN: KARTU VOLUME
// ==========================================
function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");

  return (
    <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col p-0 gap-0">
      {/* Menggunakan bg-linear-to-br bawaan Tailwind v4 yang dikombinasikan dengan token warna semantik */}
      <CardHeader
        className={`h-32 flex items-center justify-center relative p-0 rounded-t-xl
          ${vol.isUnlocked
            ? "bg-linear-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700"
            : "bg-linear-to-br from-primary to-primary/70"
          }`}
      >
        <span className="text-white/20 font-black text-6xl absolute left-4 top-1 select-none leading-none" aria-hidden>
          {paddedId}
        </span>
        <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-white text-xs font-bold z-10">
          {TEXT_CONTENT.volumeLabel} {paddedId}
        </div>
        {!vol.isUnlocked && (
          <div className="absolute top-3 right-3">
            <Lock className="w-4 h-4 text-white/60" />
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
            <span className="text-xs text-muted-foreground italic">{TEXT_CONTENT.unlockedStatus}</span>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold border-0">
              <Link href={`${ROUTES.tryout}/${vol.id}`} transitionTypes={["slide"]}>
                {TEXT_CONTENT.actionStart}
              </Link>
            </Button>
          </>
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
              <Link href={`${ROUTES.checkout}/${vol.id}`}>{TEXT_CONTENT.actionBuy}</Link>
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

// ==========================================
// KOMPONEN UTAMA GRID
// ==========================================
export function TryoutGrid({ volumes }: { volumes: TryoutVolume[] }) {
  const [query, setQuery] = useState("");

  const filtered = volumes.filter((v) =>
    v.title.toLowerCase().includes(query.toLowerCase()) ||
    v.id.toString().includes(query)
  );

  return (
    <div className="space-y-6">
      <div className="relative w-full md:w-80">
        <Input
          type="search"
          placeholder={TEXT_CONTENT.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl"
          aria-label="Cari volume tryout"
        />
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
          <p className="font-medium">{TEXT_CONTENT.noMatch} "{query}"</p>
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