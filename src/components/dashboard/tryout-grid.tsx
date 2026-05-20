"use client";

import { useState, useDeferredValue, useMemo, memo } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  Search,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  Play,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ==========================================
// KONFIGURASI
// ==========================================
const INT_CONFIG = { locale: "id-ID", currency: "IDR" } as const;
const ROUTES = { tryout: "/tryout", checkout: "/checkout" } as const;

export interface TryoutVolume {
  id: number;
  title: string;
  totalSoal: number;
  durasiMenit: number;
  harga: number;
  hargaAsli: number;
  isUnlocked: boolean;
  isAvailable: boolean;
  lastHistory?: { totalSkor: number; isLolos: boolean } | null;
  totalPengerjaan?: number;
}

const currencyFormatter = new Intl.NumberFormat(INT_CONFIG.locale, {
  style: "currency",
  currency: INT_CONFIG.currency,
  minimumFractionDigits: 0,
});

function formatRupiah(n: number): string {
  return currencyFormatter.format(n);
}

// ==========================================
// TEMA WARNA PER STATUS
// ==========================================
const THEMES = {
  // TERKUNCI — Merah
  locked: {
    card: "border-t-red-600 border-red-200 bg-red-50",
    title: "text-red-900",
    badge: "bg-red-400 text-white border-0",
    meta: "text-red-600",
    desc: "text-red-800",
    btn: "bg-red-400 hover:bg-red-600 text-white border-0",
  },
  // SIAP DIKERJAKAN — Ungu
  unlocked: {
    card: "border-t-primary border-purple-200 bg-purple-50",
    title: "text-purple-900",
    badge: "bg-primary text-primary-foreground border-0",
    meta: "text-primary",
    desc: "text-purple-800",
    btn: "bg-primary hover:bg-purple-800 text-primary-foreground border-0",
  },
  // SELESAI — Hijau
  finished: {
    card: "border-t-teal-600 border-teal-200 bg-teal-50",
    title: "text-teal-900",
    badge: "bg-teal-400 text-white border-0",
    meta: "text-teal-600",
    desc: "text-teal-800",
    btn: "bg-teal-600 hover:bg-teal-800 text-white border-0",
  },
} as const;

// ==========================================
// SUB-KOMPONEN: KARTU VOLUME
// ==========================================
const VolumeCard = memo(function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");
  const isFinished = (vol.totalPengerjaan ?? 0) > 0;
  const isLocked = !vol.isUnlocked;

  const theme = isFinished
    ? THEMES.finished
    : isLocked
    ? THEMES.locked
    : THEMES.unlocked;

  return (
    // h-full memastikan kartu mengisi tinggi sel grid (sama rata per baris)
    <Card
      className={cn(
        "h-full flex flex-col border-t-4 border transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
        theme.card
      )}
    >
      {/* HEADER */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className={cn("text-base font-semibold leading-tight", theme.title)}>
            {vol.title}
          </CardTitle>
          <Badge
            className={cn(
              "shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest",
              theme.badge
            )}
          >
            Vol. {paddedId}
          </Badge>
        </div>

        <CardDescription className={cn("flex items-center gap-4 pt-1.5", theme.meta)}>
          <span className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            {vol.durasiMenit}m
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            {vol.totalSoal} Soal
          </span>
        </CardDescription>
      </CardHeader>

      {/* BODY — flex-1 mendorong footer selalu ke bawah */}
      <CardContent className="flex-1 pb-4">
        {isFinished && vol.lastHistory ? (
          // Panel skor
          <div className="rounded-lg border border-teal-200 bg-teal-100 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-teal-800">
                Skor Terakhir
              </span>
              <span className="text-lg font-bold text-teal-900">
                {vol.lastHistory.totalSkor}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-teal-800">
                Status
              </span>
              <span
                className={cn(
                  "rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white",
                  vol.lastHistory.isLolos
                    ? "bg-teal-600"
                    : "bg-red-600" // Fallback ke red jika status gagal
                )}
              >
                {vol.lastHistory.isLolos ? "Lolos" : "Belum Lolos"}
              </span>
            </div>
          </div>
        ) : (
          // Deskripsi dengan min-height agar body locked/unlocked tingginya konsisten
          <p className={cn("min-h-16 text-sm leading-relaxed", theme.desc)}>
            {vol.isUnlocked
              ? "Paket siap dikerjakan. Uji kemampuanmu sekarang dengan latihan HOTS terkini."
              : "Beli paket ini untuk membuka akses penuh simulasi CAT CPNS."}
          </p>
        )}
      </CardContent>

      {/* FOOTER — selalu rata bawah */}
      <CardFooter className="pt-0">
        <Button
          asChild
          size="lg"
          className={cn(
            "w-full font-semibold active:scale-[0.98] transition-all",
            theme.btn
          )}
        >
          <Link
            href={
              vol.isUnlocked || isFinished
                ? `${ROUTES.tryout}/${vol.id}`
                : `${ROUTES.checkout}/${vol.id}`
            }
          >
            {isFinished ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Evaluasi Ulang
              </>
            ) : vol.isUnlocked ? (
              <>
                <Play className="mr-2 h-4 w-4" />
                Mulai Kerjakan
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Beli {formatRupiah(vol.harga)}
              </>
            )}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
});

// ==========================================
// KOMPONEN UTAMA GRID
// ==========================================
export function TryoutGrid({ volumes }: { volumes: TryoutVolume[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase();
    return volumes.filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.id.toString().includes(lowerQuery)
    );
  }, [deferredQuery, volumes]);

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari berdasarkan volume atau nama paket..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-xl pl-10 text-sm shadow-sm focus-visible:ring-ring"
        />
      </div>

      {/* Grid — items-stretch menyamakan tinggi kartu per baris */}
      <div className="grid grid-cols-1 gap-5 items-stretch md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Search className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            Paket Tidak Ditemukan
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tidak ada paket tryout yang cocok dengan pencarian &ldquo;{query}&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}