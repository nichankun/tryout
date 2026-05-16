/**
 * components/tryout-grid.tsx
 *
 * ✅ Client Component — karena ada state search
 * ✅ React Compiler: TIDAK perlu useMemo untuk filter, compiler otomatis optimasi
 * ✅ Semua UI memakai shadcn/ui: Card, Button, Badge, Input
 * ✅ next/link pakai transitionTypes (Next.js 16.2 feature)
 */

"use client";

import { useState } from "react";
import Link from "next/link";

// ✅ shadcn/ui components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

// ✅ Lucide icons
import { Clock, FileText, Lock, Search, Zap } from "lucide-react";

import type { TryoutVolume } from "@/app/dashboard/page";

// ============================================================
// FORMAT HARGA — helper pure function (tidak perlu memo)
// ============================================================
function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// ============================================================
// VOLUME CARD — sub-component (React Compiler akan memoize otomatis)
// ============================================================
function VolumeCard({ vol }: { vol: TryoutVolume }) {
  const padded = vol.id.toString().padStart(2, "0");

  return (
    // ✅ Card dari shadcn/ui — consistent styling, dark mode ready
    <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col p-0 gap-0">

      {/* Card Header — gradient background */}
      <CardHeader
        className={`h-32 flex items-center justify-center relative p-0 rounded-t-xl
          ${vol.isUnlocked
            ? "bg-linear-to-br from-emerald-500 to-teal-600"
            : "bg-linear-to-br from-blue-500 to-indigo-600"
          }`}
      >
        {/* Nomor besar dekoratif */}
        <span
          className="text-white/20 font-black text-6xl absolute left-4 top-1 select-none leading-none"
          aria-hidden
        >
          {padded}
        </span>

        {/* Label volume */}
        <div className="bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-white text-xs font-bold z-10">
          Volume {padded}
        </div>

        {/* Lock icon untuk volume yang belum dibeli */}
        {!vol.isUnlocked && (
          <div className="absolute top-3 right-3">
            <Lock className="w-4 h-4 text-white/60" aria-label="Terkunci" />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col grow">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-2 leading-tight">
          {vol.title}
        </h3>

        {/* Info chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {vol.isUnlocked ? (
            // ✅ Badge shadcn/ui dengan variant custom
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100">
              <Zap className="w-3 h-3 mr-1" aria-hidden />
              Tersedia
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400 text-xs gap-1">
                <Clock className="w-3 h-3" aria-hidden />
                {vol.durasiMenit} Menit
              </Badge>
              <Badge variant="outline" className="text-slate-500 dark:text-slate-400 text-xs gap-1">
                <FileText className="w-3 h-3" aria-hidden />
                {vol.totalSoal} Soal
              </Badge>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0 flex items-center justify-between mt-auto">
        {vol.isUnlocked ? (
          <>
            <span className="text-xs text-slate-400 italic">Sudah diaktifkan</span>
            {/*
              ✅ Link dengan transitionTypes — fitur Next.js 16.2
              Animasi slide saat navigasi ke halaman tryout
            */}
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">
              <Link
                href={`/tryout/${vol.id}`}
          
                transitionTypes={["slide"]}
              >
                Mulai Kerjakan
              </Link>
            </Button>
          </>
        ) : (
          <>
            {/* Harga */}
            <div>
              <p className="text-[10px] text-slate-400 line-through leading-none mb-0.5">
                {formatRupiah(vol.hargaAsli)}
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-bold text-sm leading-none">
                {formatRupiah(vol.harga)}
              </p>
            </div>

            {/* ✅ Button shadcn/ui */}
            <Button size="sm" className="rounded-lg font-bold">
              Beli Sekarang
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================================
// TRYOUT GRID — komponen utama dengan search
// ============================================================
export function TryoutGrid({ volumes }: { volumes: TryoutVolume[] }) {
  const [query, setQuery] = useState("");

  // ✅ React Compiler otomatis memoize kalkulasi ini
  // Tidak perlu useMemo(() => ..., [query, volumes])
  const filtered = volumes.filter((v) =>
    v.title.toLowerCase().includes(query.toLowerCase()) ||
    v.id.toString().includes(query)
  );

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        {/* ✅ Input dari shadcn/ui */}
        <Input
          type="search"
          placeholder="Cari volume..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 rounded-xl"
          aria-label="Cari volume tryout"
        />
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          aria-hidden
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
          <p className="font-medium">Tidak ada volume yang cocok dengan "{query}"</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((vol) => (
          <VolumeCard key={vol.id} vol={vol} />
        ))}
      </div>
    </div>
  );
}