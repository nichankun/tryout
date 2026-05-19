/**
 * app/riwayat/page.tsx
 * * Async Server Component untuk menampilkan visualisasi riwayat pengerjaan tryout.
 * Terhubung langsung ke PostgreSQL melalui Drizzle ORM dan diproteksi auth v5.
 * Dioptimalkan dengan Singleton Formatter (Zero CPU Leak) dan Relational Query Builder.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories, tryoutPackages } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, XCircle, BarChart3,
  BookOpen, Clock, ChevronRight, FileText,
} from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  locale: "id-ID",
} as const;

const EXAM_THRESHOLDS = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

const ROUTES = {
  loginRedirect: "/login?callbackUrl=/riwayat",
  dashboard: "/dashboard",
  detailHasil: (packageId: number, historyId: string) => `/tryout/${packageId}/hasil?historyId=${historyId}`,
} as const;

const TEXT_CONTENT = {
  metaTitle: `Riwayat Tryout — ${APP_CONFIG.name}`,
  metaDesc: "Lihat riwayat dan hasil semua tryout SKD yang pernah kamu kerjakan.",
  title: "Riwayat Tryout",
  subtitle: "Semua tryout SKD yang pernah kamu kerjakan",
  btnActionMain: "Coba Volume Lain",
  statTotalExams: "Total Ujian",
  statPassed: "Lolos",
  statAvgScore: "Rerata Skor",
  statHighScore: "Skor Tertinggi",
  emptyStateTitle: "Belum ada riwayat tryout",
  emptyStateDesc: "Kerjakan tryout pertamamu dan hasilnya akan muncul di sini.",
  emptyStateBtn: "Mulai Tryout",
  tableHeaderSummary: (count: number) => `${count} Ujian Tercatat`,
  thPackage: "Paket",
  thTwk: "TWK",
  thTiu: "TIU",
  thTkp: "TKP",
  thTotal: "Total",
  thStatus: "Status",
  thDate: "Tanggal",
  thAction: "Aksi",
  badgePassed: "Lolos",
  badgeFailed: "Belum",
  btnDetail: "Detail",
  footerThresholds: "Passing grade BKN:",
} as const;

export const metadata: Metadata = {
  title: TEXT_CONTENT.metaTitle,
  description: TEXT_CONTENT.metaDesc,
};

// ==========================================
// OPTIMASI CPU: SINGLETON FORMATTER
// ==========================================
// Mencegah memory/CPU leak dengan meletakkan instance Intl di luar fungsi render.
// Instance ini hanya dibuat satu kali selamanya di memori server.
const dateTimeFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

function formatTanggal(date: Date | null): string {
  if (!date) return "-";
  return dateTimeFormatter.format(date);
}

// ==========================================
// KOMPONEN UTAMA (SERVER COMPONENT)
// ==========================================
export default async function RiwayatPage() {
  // 1. Validasi Keamanan Proteksi Sesi Pengguna
  const session = await auth();
  if (!session?.user?.id) redirect(ROUTES.loginRedirect);

  // 2. Tarik Data Komparatif Riwayat dari Database Relasional
  // Anda sudah sangat brilian melakukan Partial Select (tidak mengambil JSON jawabanSiswa)
  const histories = await db
    .select({
      id:           tryoutHistories.id,
      packageId:    tryoutHistories.packageId,
      packageTitle: tryoutPackages.title,
      skorTwk:      tryoutHistories.skorTwk,
      skorTiu:      tryoutHistories.skorTiu,
      skorTkp:      tryoutHistories.skorTkp,
      totalSkor:    tryoutHistories.totalSkor,
      isLolos:      tryoutHistories.isLolos,
      endTime:      tryoutHistories.endTime,
    })
    .from(tryoutHistories)
    .innerJoin(tryoutPackages, eq(tryoutHistories.packageId, tryoutPackages.id))
    .where(eq(tryoutHistories.userId, session.user.id))
    .orderBy(desc(tryoutHistories.endTime));

  // 3. Kalkulasi Cepat Skalar
  const totalUjian = histories.length;
  let totalLolos = 0;
  let akumulasiSkor = 0;
  let skorTertinggi = 0;

  // OPTIMASI: Menggunakan satu iterasi loop (O(n)) untuk seluruh perhitungan statistik
  for (const r of histories) {
    if (r.isLolos) totalLolos++;
    akumulasiSkor += r.totalSkor;
    if (r.totalSkor > skorTertinggi) skorTertinggi = r.totalSkor;
  }

  const rerataSkor = totalUjian > 0 ? Math.round(akumulasiSkor / totalUjian) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ATAS: BARIS JUDUL DAN AKSI UTAMA */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" aria-hidden />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {TEXT_CONTENT.title}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {TEXT_CONTENT.subtitle}
            </p>
          </div>
          <Button asChild className="rounded-xl font-bold gap-2">
            <Link href={ROUTES.dashboard}>
              <BookOpen className="w-4 h-4" aria-hidden />
              {TEXT_CONTENT.btnActionMain}
            </Link>
          </Button>
        </div>

        {/* TENGAH: GRID MATRIKS RINGKASAN METRIK PERFORMA */}
        {totalUjian > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: TEXT_CONTENT.statTotalExams, value: totalUjian,    color: "text-primary",      bg: "bg-primary/5 border-primary/10" },
              { label: TEXT_CONTENT.statPassed,     value: totalLolos,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10 dark:border-emerald-500/20" },
              { label: TEXT_CONTENT.statAvgScore,   value: rerataSkor,    color: "text-purple-600 dark:text-purple-400",   bg: "bg-purple-500/5 border-purple-500/10 dark:border-purple-500/20" },
              { label: TEXT_CONTENT.statHighScore,  value: skorTertinggi, color: "text-amber-600 dark:text-amber-400",      bg: "bg-amber-500/5 border-amber-500/10 dark:border-amber-500/20" },
            ].map((s) => (
              <Card key={s.label} className={`rounded-2xl border shadow-sm ${s.bg}`}>
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* BAWAH: TABEL RIWAYAT ATAU FALLBACK KOSONG */}
        {totalUjian === 0 ? (
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="py-20 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/40" aria-hidden />
              <p className="font-semibold text-foreground/80">
                {TEXT_CONTENT.emptyStateTitle}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {TEXT_CONTENT.emptyStateDesc}
              </p>
              <Button asChild className="mt-2 rounded-xl font-bold">
                <Link href={ROUTES.dashboard}>{TEXT_CONTENT.emptyStateBtn}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border py-3 px-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" aria-hidden />
                <span className="text-sm font-bold text-foreground">
                  {TEXT_CONTENT.tableHeaderSummary(totalUjian)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b border-border">
                    <TableHead className="font-bold text-foreground pl-5">{TEXT_CONTENT.thPackage}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thTwk}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thTiu}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thTkp}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thTotal}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thStatus}</TableHead>
                    <TableHead className="text-right font-bold text-foreground pr-5">{TEXT_CONTENT.thDate}</TableHead>
                    <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.thAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.map((item) => (
                    <TableRow key={item.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-5">
                        <p className="text-foreground font-semibold text-sm">
                          {item.packageTitle}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTwk >= EXAM_THRESHOLDS.passingGrade.twk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {item.skorTwk}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTiu >= EXAM_THRESHOLDS.passingGrade.tiu ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {item.skorTiu}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-bold ${item.skorTkp >= EXAM_THRESHOLDS.passingGrade.tkp ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {item.skorTkp}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-base font-black text-foreground">
                          {item.totalSkor}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isLolos ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 hover:bg-emerald-500/10">
                            <CheckCircle2 className="w-3 h-3" />{TEXT_CONTENT.badgePassed}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 hover:bg-destructive/10">
                            <XCircle className="w-3 h-3" />{TEXT_CONTENT.badgeFailed}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTanggal(item.endTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" asChild
                          className="rounded-lg gap-1 text-primary hover:text-primary hover:bg-primary/10 transition-colors">
                          <Link href={ROUTES.detailHasil(item.packageId, item.id)}>
                            {TEXT_CONTENT.btnDetail}
                            <ChevronRight className="w-3 h-3" />
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

        {/* KAKI BANNER INFORMASI KISI AMBANG BATAS */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground justify-center opacity-80">
          <span>{TEXT_CONTENT.footerThresholds}</span>
          <span>TWK ≥ {EXAM_THRESHOLDS.passingGrade.twk}</span>
          <span>·</span>
          <span>TIU ≥ {EXAM_THRESHOLDS.passingGrade.tiu}</span>
          <span>·</span>
          <span>TKP ≥ {EXAM_THRESHOLDS.passingGrade.tkp}</span>
        </div>

      </div>
    </div>
  );
}