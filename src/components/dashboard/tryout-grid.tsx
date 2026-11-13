"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Play,
  Package,
  RotateCcw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPackageCover } from "@/lib/constants/package-covers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";

const ROUTES = { tryout: "/tryout", checkout: "/checkout" } as const;

export interface TryoutVolume {
  id: number;
  title: string;
  totalSoal: number;
  durasiMenit: number;
  harga: number;
  isUnlocked: boolean;
  isAvailable: boolean;
  lastHistory?: { totalSkor: number; isLolos: boolean } | null;
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const VolumeCard = memo(function VolumeCard({
  vol,
  coverIndex,
}: {
  vol: TryoutVolume;
  coverIndex: number;
}) {
  const cover = getPackageCover(null, coverIndex, vol.title);
  const paddedId = vol.id.toString().padStart(2, "0");
  const isFinished = Boolean(vol.lastHistory);
  const isLocked = !vol.isUnlocked;
  const isUnavailable = !vol.isAvailable;

  const description = isUnavailable
    ? "Paket ini sedang disiapkan dan akan tersedia setelah soal ditambahkan."
    : isFinished
      ? "Tinjau kembali hasil dan pembahasan, atau ulangi simulasi untuk meningkatkan skor."
      : isLocked
        ? "Buka akses untuk mengerjakan simulasi dan mempelajari pembahasan soal."
        : "Paket sudah terbuka. Mulai simulasi dan tinjau hasil latihanmu.";

  return (
    <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-[1.4rem] border border-purple-100 bg-white p-0 shadow-[0_12px_34px_-24px_rgba(16,55,89,0.22)] ring-0 transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-[0_20px_42px_-24px_rgba(16,55,89,0.28)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[1.95/1] overflow-hidden bg-purple-950">
        <Image
          src={cover.image}
          alt={cover.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: cover.tone }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-950/20 to-purple-950/10" aria-hidden="true" />

        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2 sm:inset-x-5 sm:top-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-purple-950/35 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            <BookOpenCheck className="size-3.5" aria-hidden="true" />
            Tryout SKD
          </span>
          <span className="rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-purple-950 shadow-sm backdrop-blur-md">
            {isUnavailable ? "Segera hadir" : isFinished ? "Hasil tersedia" : isLocked ? "Paket latihan" : "Akses aktif"}
          </span>
        </div>

        <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/75">Volume {paddedId}</p>
          <CardTitle className="mt-1 line-clamp-1 text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-[1.375rem]">
            {vol.title}
          </CardTitle>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {isUnavailable ? "Status paket" : isFinished ? "Skor terakhir" : isLocked ? "Harga paket" : "Status akses"}
            </p>
            <p className="mt-1 truncate text-lg font-bold tracking-tight text-purple-950 sm:text-xl">
              {isUnavailable
                ? "Segera hadir"
                : isFinished && vol.lastHistory
                  ? vol.lastHistory.totalSkor
                  : isLocked
                    ? vol.harga === 0 ? "Gratis" : currencyFormatter.format(vol.harga)
                    : "Siap latihan"}
            </p>
          </div>
          {!isUnavailable && isFinished && vol.lastHistory ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold",
                vol.lastHistory.isLolos ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800",
              )}
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {vol.lastHistory.isLolos ? "Target tercapai" : "Terus berlatih"}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700">
              <BookOpenCheck className="size-3.5" aria-hidden="true" />
              {isUnavailable ? "Disiapkan" : isLocked ? vol.harga === 0 ? "Paket gratis" : "Satu kali beli" : "Akses aktif"}
            </span>
          )}
        </div>

        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{description}</p>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/80 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs font-semibold text-foreground">
            <ClipboardList className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{vol.totalSoal} soal</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs font-semibold text-foreground">
            <Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{vol.durasiMenit} menit</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto p-4 pt-0 sm:p-5 sm:pt-0">
        {isUnavailable ? (
          <Button disabled className="h-11 w-full rounded-xl">Belum tersedia</Button>
        ) : isLocked ? (
          <Button asChild className="h-11 w-full rounded-xl font-bold shadow-sm transition-transform hover:shadow-md active:scale-[0.98]">
            <Link href={`${ROUTES.checkout}/${vol.id}`}>
              {vol.harga === 0 ? "Ambil paket gratis" : "Lihat paket"}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : isFinished ? (
          <Button asChild className="h-11 w-full rounded-xl bg-teal-700 font-bold text-white transition-transform hover:bg-teal-800 active:scale-[0.98]">
            <Link href={`${ROUTES.tryout}/${vol.id}`}>
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              Ulangi simulasi
            </Link>
          </Button>
        ) : (
          <Button asChild className="h-11 w-full rounded-xl font-bold shadow-sm transition-transform hover:shadow-md active:scale-[0.98]">
            <Link href={`${ROUTES.tryout}/${vol.id}`}>
              <Play className="mr-2 size-4 fill-current" aria-hidden="true" />
              Mulai paket
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});

export function TryoutGrid({ volumes }: { volumes: TryoutVolume[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const lowerQuery = deferredQuery.trim().toLocaleLowerCase("id-ID");
    return volumes.filter(
      (volume) =>
        volume.title.toLocaleLowerCase("id-ID").includes(lowerQuery) ||
        volume.id.toString().includes(lowerQuery),
    );
  }, [deferredQuery, volumes]);
  const coverOrder = useMemo(
    () => new Map(volumes.map((volume, index) => [volume.id, index] as const)),
    [volumes],
  );
  const EmptyIcon = volumes.length > 0 ? Search : Package;
  const emptyTitle = volumes.length > 0 ? "Paket tidak ditemukan" : "Belum ada paket tryout";
  const emptyDescription = volumes.length > 0
    ? `Tidak ada paket yang cocok dengan pencarian “${query}”.`
    : "Paket tryout yang siap dikerjakan akan muncul di halaman ini.";

  return (
    <div className="space-y-4">
      {volumes.length > 0 ? (
        <div className="relative w-full sm:max-w-[300px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Cari paket latihan..."
            aria-label="Cari paket latihan"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 rounded-xl border-purple-100 bg-white pl-10 text-sm shadow-sm placeholder:text-muted-foreground/80"
          />
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((volume) => (
            <VolumeCard key={volume.id} vol={volume} coverIndex={coverOrder.get(volume.id) ?? 0} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-purple-100 bg-white py-8 text-center lg:py-7">
          <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-primary lg:size-9">
            <EmptyIcon className="size-5 lg:size-4" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-purple-950">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground lg:text-xs">
            {emptyDescription}
          </p>
        </div>
      )}
    </div>
  );
}
