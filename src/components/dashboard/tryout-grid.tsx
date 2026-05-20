"use client";

import { useState, useDeferredValue, useMemo, memo } from "react";
import Link from "next/link";
import {
  Clock,
  FileText,
  Search,
  RotateCcw,
  Lock,
  Play,
  CheckCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
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
// SUB-KOMPONEN: KARTU VOLUME (UI Diperbarui)
// ==========================================
const VolumeCard = memo(function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");
  const isFinished = (vol.totalPengerjaan ?? 0) > 0;
  const isLocked = !vol.isUnlocked;

  return (
    <Card className="h-full flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      
      {/* ── HEADER: Highlight Produk (Meniru Desain Referensi) ── */}
      <div className="bg-primary p-6 flex flex-col items-start justify-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/80">
          Paket Tryout
        </span>
        <CardTitle className="text-2xl font-bold leading-tight text-primary-foreground">
          {vol.title}
        </CardTitle>
        <span className="inline-block rounded-full bg-primary-foreground px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary shadow-sm">
          Vol. {paddedId}
        </span>
      </div>

      {/* ── BODY: Detail Harga, Deskripsi & Fitur ── */}
      <CardContent className="flex-1 p-6 space-y-6">
        
        {/* Sesi Harga / Status Panel */}
        {isFinished && vol.lastHistory ? (
          /* Panel skor untuk paket yang sudah dikerjakan */
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-teal-800 font-medium">Skor terakhir</span>
              <span className="font-mono text-2xl font-black text-teal-900">
                {vol.lastHistory.totalSkor}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-teal-800 font-medium">Status</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white",
                  vol.lastHistory.isLolos ? "bg-teal-600" : "bg-red-600"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {vol.lastHistory.isLolos ? "Lolos" : "Belum Lolos"}
              </span>
            </div>
          </div>
        ) : isLocked ? (
          /* Panel Harga untuk paket terkunci (Meniru Referensi) */
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {formatRupiah(vol.harga)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                / selamanya
              </span>
            </div>
            {vol.hargaAsli > vol.harga && (
              <span className="text-sm text-muted-foreground line-through">
                {formatRupiah(vol.hargaAsli)}
              </span>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground pt-1">
              Beli paket ini untuk membuka akses penuh simulasi CAT CPNS. Bisa dikerjakan berulang dan aktif seumur hidup.
            </p>
          </div>
        ) : (
          /* Panel Unlocked untuk paket siap kerjakan */
          <div className="space-y-2">
            <span className="text-xl font-bold text-primary">Siap Dikerjakan</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paket ini sudah terbuka. Uji kemampuanmu sekarang dengan simulasi CAT dan soal HOTS terkini.
            </p>
          </div>
        )}

        {/* Garis Pemisah (Divider) */}
        <div className="h-px w-full bg-border" />

        {/* Checklist Fitur Terintegrasi */}
        <ul className="space-y-3.5">
          <li className="flex items-start gap-3 text-sm text-foreground/90">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="leading-snug">Berisi {vol.totalSoal} soal SKD (TWK, TIU, TKP) sesuai kisi-kisi terbaru</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-foreground/90">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="leading-snug">Simulasi sistem CAT BKN real test ({vol.durasiMenit} menit)</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-foreground/90">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="leading-snug">Nilai keluar otomatis + pembahasan lengkap</span>
          </li>
        </ul>

      </CardContent>

      {/* ── FOOTER: Call To Action ── */}
      <CardFooter className="p-6 pt-0 mt-auto">
        {isLocked ? (
          /* Locked: Tombol Outline/Solid meniru gambar */
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl font-bold border-border text-foreground hover:bg-muted active:scale-[0.98] transition-transform"
          >
            <Link href={`${ROUTES.checkout}/${vol.id}`}>
              Beli sekarang
            </Link>
          </Button>
        ) : isFinished ? (
          /* Selesai: Tombol hijau evaluasi ulang */
          <Button
            asChild
            className="w-full h-11 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white active:scale-[0.98] transition-transform"
          >
            <Link href={`${ROUTES.tryout}/${vol.id}`}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Evaluasi Ulang
            </Link>
          </Button>
        ) : (
          /* Unlocked: Tombol utama mulai kerjakan */
          <Button
            asChild
            className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-purple-800 text-primary-foreground active:scale-[0.98] transition-transform"
          >
            <Link href={`${ROUTES.tryout}/${vol.id}`}>
              <Play className="mr-2 h-4 w-4 fill-current" />
              Mulai Kerjakan
            </Link>
          </Button>
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
          className="h-11 rounded-xl pl-10 text-sm shadow-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 items-stretch md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50">
            <Search className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">
            Paket Tidak Ditemukan
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tidak ada paket yang cocok dengan pencarian &ldquo;{query}&rdquo;.
          </p>
        </div>
      )}

    </div>
  );
}