/**
 * app/riwayat/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories, tryoutPackages } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  CheckCircle2, XCircle, BarChart3,
  Clock, ChevronRight, FileText,
  Trophy, TrendingUp, Star, BookOpen,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";

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
  detailHasil: (packageId: number, historyId: string) =>
    `/dashboard/${packageId}/hasil?historyId=${historyId}`,
} as const;

const TEXT_CONTENT = {
  metaTitle: `Riwayat Tryout — ${APP_CONFIG.name}`,
  metaDesc: "Lihat riwayat dan hasil semua tryout SKD yang pernah kamu kerjakan.",
  title: "Riwayat Tryout",
  subtitle: "Semua tryout SKD yang pernah kamu kerjakan",
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
// SINGLETON FORMATTER
// ==========================================
const dateTimeFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});

function formatTanggal(date: Date | null): string {
  if (!date) return "-";
  return dateTimeFormatter.format(date);
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function RiwayatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(ROUTES.loginRedirect);

  const histories = await db
    .select({
      id:            tryoutHistories.id,
      packageId:     tryoutHistories.packageId,
      packageTitle:  tryoutPackages.title,
      skorTwk:       tryoutHistories.skorTwk,
      skorTiu:       tryoutHistories.skorTiu,
      skorTkp:       tryoutHistories.skorTkp,
      totalSkor:     tryoutHistories.totalSkor,
      isLolos:       tryoutHistories.isLolos,
      endTime:       tryoutHistories.endTime,
    })
    .from(tryoutHistories)
    .innerJoin(tryoutPackages, eq(tryoutHistories.packageId, tryoutPackages.id))
    .where(eq(tryoutHistories.userId, session.user.id))
    .orderBy(desc(tryoutHistories.endTime));

  const totalUjian = histories.length;
  let totalLolos = 0;
  let akumulasiSkor = 0;
  let skorTertinggi = 0;

  for (const r of histories) {
    if (r.isLolos) totalLolos++;
    akumulasiSkor += r.totalSkor;
    if (r.totalSkor > skorTertinggi) skorTertinggi = r.totalSkor;
  }

  const rerataSkor = totalUjian > 0 ? Math.round(akumulasiSkor / totalUjian) : 0;

  // Konfigurasi stat cards dengan tema warna tegas per metrik (tanpa hardcode hex)
  const STAT_CARDS = [
    {
      label: TEXT_CONTENT.statTotalExams,
      value: totalUjian,
      icon: BookOpen,
      card: "bg-purple-50 border-purple-200",
      iconBg: "bg-primary",
      valueColor: "text-purple-900",
      labelColor: "text-primary",
    },
    {
      label: TEXT_CONTENT.statPassed,
      value: totalLolos,
      icon: CheckCircle2,
      card: "bg-teal-50 border-teal-200",
      iconBg: "bg-teal-600",
      valueColor: "text-teal-900",
      labelColor: "text-teal-600",
    },
    {
      label: TEXT_CONTENT.statAvgScore,
      value: rerataSkor,
      icon: TrendingUp,
      card: "bg-amber-50 border-amber-100",
      iconBg: "bg-amber-400",
      valueColor: "text-amber-900",
      labelColor: "text-amber-600",
    },
    {
      label: TEXT_CONTENT.statHighScore,
      value: skorTertinggi,
      icon: Trophy,
      card: "bg-red-50 border-red-200",
      iconBg: "bg-red-600",
      valueColor: "text-red-900",
      labelColor: "text-red-600",
    },
  ] as const;

  return (
    <div className="container mx-auto flex flex-col gap-8 py-8 md:py-10 max-w-5xl">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1 border-l-4 border-primary pl-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {TEXT_CONTENT.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {TEXT_CONTENT.subtitle}
          </p>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      {totalUjian > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 ${s.card}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${s.iconBg}`}>
                <s.icon className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="flex flex-col items-center text-center">
                <span className={`text-3xl font-extrabold ${s.valueColor}`}>
                  {s.value}
                </span>
                <span className={`mt-0.5 text-xs font-medium ${s.labelColor}`}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABEL / EMPTY STATE ── */}
      {totalUjian === 0 ? (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="space-y-3 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <FileText className="h-8 w-8 text-white" aria-hidden />
            </div>
            <p className="font-semibold text-purple-900">
              {TEXT_CONTENT.emptyStateTitle}
            </p>
            <p className="mx-auto max-w-sm text-sm text-purple-800">
              {TEXT_CONTENT.emptyStateDesc}
            </p>
            <Button
              asChild
              className="mt-2 bg-primary hover:bg-purple-800 font-semibold text-primary-foreground"
            >
              <Link href={ROUTES.dashboard}>{TEXT_CONTENT.emptyStateBtn}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-purple-200">
          {/* Card header — ungu */}
          <CardHeader className="border-b border-purple-200 bg-purple-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-bold text-purple-900">
                {TEXT_CONTENT.tableHeaderSummary(totalUjian)}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-purple-50/60">
                <TableRow className="border-b border-purple-200">
                  <TableHead className="font-bold text-purple-900">{TEXT_CONTENT.thPackage}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thTwk}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thTiu}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thTkp}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thTotal}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thStatus}</TableHead>
                  <TableHead className="text-right font-bold text-purple-900">{TEXT_CONTENT.thDate}</TableHead>
                  <TableHead className="text-center font-bold text-purple-900">{TEXT_CONTENT.thAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((item) => (
                  <TableRow key={item.id} className="border-b border-purple-200/40 hover:bg-purple-50/40">
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">
                        {item.packageTitle}
                      </p>
                    </TableCell>

                    {/* Skor TWK */}
                    <TableCell className="text-center">
                      <span className={`text-sm font-bold ${
                        item.skorTwk >= EXAM_THRESHOLDS.passingGrade.twk
                          ? "text-teal-600"
                          : "text-red-600"
                      }`}>
                        {item.skorTwk}
                      </span>
                    </TableCell>

                    {/* Skor TIU */}
                    <TableCell className="text-center">
                      <span className={`text-sm font-bold ${
                        item.skorTiu >= EXAM_THRESHOLDS.passingGrade.tiu
                          ? "text-teal-600"
                          : "text-red-600"
                      }`}>
                        {item.skorTiu}
                      </span>
                    </TableCell>

                    {/* Skor TKP */}
                    <TableCell className="text-center">
                      <span className={`text-sm font-bold ${
                        item.skorTkp >= EXAM_THRESHOLDS.passingGrade.tkp
                          ? "text-teal-600"
                          : "text-red-600"
                      }`}>
                        {item.skorTkp}
                      </span>
                    </TableCell>

                    {/* Total skor */}
                    <TableCell className="text-center">
                      <span className="text-base font-extrabold text-foreground">
                        {item.totalSkor}
                      </span>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell className="text-center">
                      {item.isLolos ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-400 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          {TEXT_CONTENT.badgePassed}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-400 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          <XCircle className="h-3 w-3" />
                          {TEXT_CONTENT.badgeFailed}
                        </span>
                      )}
                    </TableCell>

                    {/* Tanggal */}
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {formatTanggal(item.endTime)}
                    </TableCell>

                    {/* Tombol detail */}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-1 text-primary hover:bg-purple-50 hover:text-purple-800 font-semibold"
                      >
                        <Link href={ROUTES.detailHasil(item.packageId, item.id)}>
                          {TEXT_CONTENT.btnDetail}
                          <ChevronRight className="h-3 w-3" />
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

      {/* ── FOOTER PASSING GRADE ── */}
      <div className="flex flex-wrap justify-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-6 py-3 text-xs text-primary">
        <span className="font-semibold">{TEXT_CONTENT.footerThresholds}</span>
        <span className="font-bold">TWK ≥ {EXAM_THRESHOLDS.passingGrade.twk}</span>
        <span className="text-purple-200">·</span>
        <span className="font-bold">TIU ≥ {EXAM_THRESHOLDS.passingGrade.tiu}</span>
        <span className="text-purple-200">·</span>
        <span className="font-bold">TKP ≥ {EXAM_THRESHOLDS.passingGrade.tkp}</span>
      </div>

    </div>
  );
}