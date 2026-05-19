"use client";

import { useState, useDeferredValue, useMemo, memo } from "react";
import Link from "next/link";
import { Clock, FileText, Search, RotateCcw, ArrowRight } from "lucide-react";

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
// KONFIGURASI & DYNAMIC COLORS
// ==========================================
const INT_CONFIG = { locale: "id-ID", currency: "IDR" } as const;
const ROUTES = { tryout: "/tryout", checkout: "/checkout" } as const;

// Menggunakan variabel chart dari global.css Anda
const ACCENT_COLORS = [
  "border-t-chart-1",
  "border-t-chart-2",
  "border-t-chart-3",
  "border-t-chart-4",
  "border-t-chart-5",
];

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
// SUB-KOMPONEN: KARTU VOLUME
// ==========================================
const VolumeCard = memo(function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");
  const isFinished = (vol.totalPengerjaan ?? 0) > 0;
  
  // Mengambil warna border dinamis berdasarkan ID
  const borderClass = ACCENT_COLORS[vol.id % ACCENT_COLORS.length];

  return (
    <Card className={cn(
      "flex flex-col justify-between border-t-4 transition-all hover:shadow-md",
      borderClass
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg leading-tight">{vol.title}</CardTitle>
          <div className="flex flex-col items-end gap-2 shrink-0">
             <Badge variant="outline" className="font-mono text-xs">
               Vol. {paddedId}
             </Badge>
          </div>
        </div>

        <CardDescription className="flex items-center gap-3 pt-1.5">
          <span className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> {vol.durasiMenit}m
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> {vol.totalSoal} Soal
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {isFinished && vol.lastHistory ? (
          <div className="flex flex-col space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Skor Terakhir</span>
              <span className="font-semibold text-foreground">{vol.lastHistory.totalSkor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={cn(
                  "font-semibold",
                  vol.lastHistory.isLolos ? "text-chart-2" : "text-destructive"
                )}>
                {vol.lastHistory.isLolos ? "Lolos" : "Belum Lolos"}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground min-h-16">
            {vol.isUnlocked
              ? "Paket siap dikerjakan. Uji kemampuanmu sekarang dengan latihan HOTS terkini."
              : "Beli paket ini untuk membuka akses penuh simulasi CAT CPNS."}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          asChild
          className="w-full font-semibold"
          variant={isFinished ? "outline" : "default"}
        >
          <Link href={vol.isUnlocked || isFinished ? `${ROUTES.tryout}/${vol.id}` : `${ROUTES.checkout}/${vol.id}`}>
            {isFinished ? (
              <> <RotateCcw className="mr-2 h-4 w-4" /> Evaluasi Ulang </>
            ) : vol.isUnlocked ? (
              "Mulai Kerjakan"
            ) : (
              `Beli ${formatRupiah(vol.harga)}`
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
      (v) => v.title.toLowerCase().includes(lowerQuery) || v.id.toString().includes(lowerQuery)
    );
  }, [deferredQuery, volumes]);

  return (
    <div className="space-y-6">
      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari volume..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>
    </div>
  );
}