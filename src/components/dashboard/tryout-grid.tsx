"use client";

import { useState, useDeferredValue, useMemo, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, FileText, Lock, Search, Zap, RotateCcw } from "lucide-react";

// ==========================================
// KONFIGURASI & TYPES
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
  // Data tambahan untuk evaluasi
  lastHistory?: { totalSkor: number, isLolos: boolean } | null;
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
// SUB-KOMPONEN: KARTU VOLUME (Dinamis)
// ==========================================
const VolumeCard = memo(function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const paddedId = vol.id.toString().padStart(2, "0");
  const isFinished = (vol.totalPengerjaan ?? 0) > 0;

  return (
    <Card className={`overflow-hidden transition-all duration-300 group flex flex-col p-0 gap-0 border-2
      ${isFinished ? 'border-emerald-500 shadow-emerald-500/10' : 'hover:shadow-xl'}`}>
      
      {/* Header dengan status dinamis */}
      <CardHeader className={`h-32 flex items-center justify-center relative p-0 rounded-t-lg
        ${isFinished ? 'bg-emerald-600' : vol.harga === 0 ? 'bg-violet-600' : 'bg-primary'}`}>
        
        <span className="text-white/20 font-black text-6xl absolute left-4 top-1 select-none leading-none">
          {paddedId}
        </span>
        
        {isFinished && (
          <Badge className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none text-white text-[10px]">
            {vol.totalPengerjaan}x Pengerjaan
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col grow">
        <h3 className="font-bold text-foreground text-base mb-2 leading-tight">{vol.title}</h3>
        
        {/* Preview Riwayat (Evaluasi) */}
        {isFinished && vol.lastHistory ? (
          <div className="text-xs text-muted-foreground bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mb-4">
            <p className="flex justify-between">
              <span>Skor Terakhir:</span>
              <strong className="text-emerald-700">{vol.lastHistory.totalSkor}</strong>
            </p>
            <p className="flex justify-between">
              <span>Status:</span>
              <strong className={vol.lastHistory.isLolos ? "text-emerald-600" : "text-red-600"}>
                {vol.lastHistory.isLolos ? "Lolos" : "Belum Lolos"}
              </strong>
            </p>
            {/* Tombol Lihat Semua Riwayat Volume */}
      <div className="mt-3 pt-2 border-t border-emerald-200">
              <Button variant="link" className="text-[10px] h-auto p-0 text-emerald-700 hover:text-emerald-900 font-semibold" asChild>
                <Link href={`/dashboard/${vol.id}/riwayat?packageId=${vol.id}`}>
                  Lihat riwayat
                </Link>
              </Button>
            </div>
    
          </div>
          
        ) : (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
              <Clock className="w-3 h-3" /> {vol.durasiMenit} Menit
            </Badge>
            <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
              <FileText className="w-3 h-3" /> {vol.totalSoal} Soal
            </Badge>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0 mt-auto">
        <Button 
          asChild 
          className="w-full rounded-lg font-bold" 
          variant={isFinished ? "outline" : "default"}
        >
          <Link href={`${ROUTES.tryout}/${vol.id}`}>
            {isFinished ? (
              <><RotateCcw className="w-4 h-4 mr-2" /> Kerjakan Ulang (Evaluasi)</>
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
      <div className="relative w-full md:w-80">
        <Input
          type="search"
          placeholder="Cari volume..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl"
        />
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>
    </div>
  );
}