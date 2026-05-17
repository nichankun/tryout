/**
 * app/riwayat/page.tsx
 *
 * ✅ Server Component — fetch data riwayat server-side
 * ✅ params tidak ada, tapi perlu session untuk userId
 * ✅ shadcn/ui: Card, Badge, Table, Button
 *
 * 📦 INSTALL:
 *   npx shadcn@latest add table
 */

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  BarChart3,
  BookOpen,
  Clock,
  ChevronRight,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Riwayat Tryout — ASNPedia",
  description: "Lihat riwayat dan hasil semua tryout SKD yang pernah kamu kerjakan.",
};

// ── Tipe ──
interface RiwayatItem {
  id: string;
  packageId: number;
  packageTitle: string;
  skorTwk: number;
  skorTiu: number;
  skorTkp: number;
  totalSkor: number;
  isLolos: boolean;
  endTime: Date | null;
}

// ── Passing grade resmi BKN ──
const PASSING_GRADE = { twk: 65, tiu: 80, tkp: 166 };

// ── Mock data — di production: fetch dari DB berdasarkan session.user.id ──
// const riwayat = await db.query.tryoutHistories.findMany({
//   where: eq(tryoutHistories.userId, session.user.id),
//   with: { package: true },
//   orderBy: [desc(tryoutHistories.endTime)],
// });
function getMockRiwayat(): RiwayatItem[] {
  return [
    { id: "1", packageId: 1, packageTitle: "SKD CPNS - Vol 1", skorTwk: 105, skorTiu: 115, skorTkp: 176, totalSkor: 396, isLolos: true,  endTime: new Date("2026-05-10T10:30:00") },
    { id: "2", packageId: 2, packageTitle: "SKD CPNS - Vol 2", skorTwk: 60,  skorTiu: 95,  skorTkp: 170, totalSkor: 325, isLolos: false, endTime: new Date("2026-05-12T14:15:00") },
    { id: "3", packageId: 1, packageTitle: "SKD CPNS - Vol 1", skorTwk: 75,  skorTiu: 80,  skorTkp: 168, totalSkor: 323, isLolos: true,  endTime: new Date("2026-05-14T09:00:00") },
  ];
}

function formatTanggal(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export default async function RiwayatPage() {
  // ✅ Cek session — redirect ke login jika belum login
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/riwayat");

  const riwayat = getMockRiwayat();

  const totalUjian  = riwayat.length;
  const totalLolos  = riwayat.filter((r) => r.isLolos).length;
  const rerataSkor  = totalUjian > 0
    ? Math.round(riwayat.reduce((acc, r) => acc + r.totalSkor, 0) / totalUjian)
    : 0;
  const skorTertinggi = totalUjian > 0
    ? Math.max(...riwayat.map((r) => r.totalSkor))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" aria-hidden />
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Riwayat Tryout
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Semua tryout SKD yang pernah kamu kerjakan
            </p>
          </div>
          <Button asChild className="rounded-xl font-bold gap-2">
            <Link href="/dashboard">
              <BookOpen className="w-4 h-4" aria-hidden />
              Coba Volume Lain
            </Link>
          </Button>
        </div>

        {/* Statistik ringkas */}
        {totalUjian > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Ujian",     value: totalUjian,    color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900" },
              { label: "Lolos",           value: totalLolos,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900" },
              { label: "Rerata Skor",     value: rerataSkor,    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900" },
              { label: "Skor Tertinggi",  value: skorTertinggi, color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900" },
            ].map((s) => (
              <Card key={s.label} className={`rounded-2xl border shadow-sm ${s.bg}`}>
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabel riwayat */}
        {totalUjian === 0 ? (
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="py-20 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Belum ada riwayat tryout
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Kerjakan tryout pertamamu dan hasilnya akan muncul di sini.
              </p>
              <Button asChild className="mt-2 rounded-xl font-bold">
                <Link href="/dashboard">Mulai Tryout</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-3 px-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" aria-hidden />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {totalUjian} Ujian Tercatat
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="font-bold pl-5">Paket</TableHead>
                    <TableHead className="text-center font-bold">TWK</TableHead>
                    <TableHead className="text-center font-bold">TIU</TableHead>
                    <TableHead className="text-center font-bold">TKP</TableHead>
                    <TableHead className="text-center font-bold">Total</TableHead>
                    <TableHead className="text-center font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold pr-5">Tanggal</TableHead>
                    <TableHead className="text-center font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riwayat.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">

                      {/* Paket */}
                      <TableCell className="pl-5 font-medium">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                          {item.packageTitle}
                        </p>
                      </TableCell>

                      {/* TWK */}
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTwk >= PASSING_GRADE.twk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {item.skorTwk}
                        </span>
                      </TableCell>

                      {/* TIU */}
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTiu >= PASSING_GRADE.tiu ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {item.skorTiu}
                        </span>
                      </TableCell>

                      {/* TKP */}
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTkp >= PASSING_GRADE.tkp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {item.skorTkp}
                        </span>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-center">
                        <span className="text-base font-black text-slate-800 dark:text-slate-100">
                          {item.totalSkor}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {item.isLolos ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1 hover:bg-emerald-100">
                            <CheckCircle2 className="w-3 h-3" aria-hidden />
                            Lolos
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 gap-1 hover:bg-red-100">
                            <XCircle className="w-3 h-3" aria-hidden />
                            Belum
                          </Badge>
                        )}
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="text-right pr-5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {formatTanggal(item.endTime)}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="rounded-lg gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          <Link href={`/tryout/${item.packageId}/hasil`}>
                            Detail
                            <ChevronRight className="w-3 h-3" aria-hidden />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Legenda passing grade */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500 justify-center">
          <span>Passing grade BKN:</span>
          <span>TWK ≥ {PASSING_GRADE.twk}</span>
          <span>·</span>
          <span>TIU ≥ {PASSING_GRADE.tiu}</span>
          <span>·</span>
          <span>TKP ≥ {PASSING_GRADE.tkp}</span>
        </div>

      </div>
    </div>
  );
}