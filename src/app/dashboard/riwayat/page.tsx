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
  ChevronRight, FileText, ArrowRight,
  Trophy, TrendingUp, BookOpen,
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
  loginRedirect: "/login?callbackUrl=/dashboard/riwayat",
  packages: "/dashboard/paket",
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

  // Warna aksen metrik mengikuti ringkasan dashboard.
  const STAT_CARDS = [
    {
      label: TEXT_CONTENT.statTotalExams,
      value: totalUjian,
      icon: BookOpen,
      card: "lg:bg-purple-700",
      iconBg: "bg-purple-100 text-primary lg:bg-white/15 lg:text-white",
      valueColor: "text-purple-950 lg:text-white",
      labelColor: "text-primary lg:text-white/80",
    },
    {
      label: TEXT_CONTENT.statPassed,
      value: totalLolos,
      icon: CheckCircle2,
      card: "lg:bg-teal-700",
      iconBg: "bg-teal-100 text-teal-800 lg:bg-white/15 lg:text-white",
      valueColor: "text-purple-950 lg:text-white",
      labelColor: "text-teal-700 lg:text-white/80",
    },
    {
      label: TEXT_CONTENT.statAvgScore,
      value: rerataSkor,
      icon: TrendingUp,
      card: "lg:bg-amber-700",
      iconBg: "bg-amber-100 text-amber-800 lg:bg-white/15 lg:text-white",
      valueColor: "text-purple-950 lg:text-white",
      labelColor: "text-amber-700 lg:text-white/80",
    },
    {
      label: TEXT_CONTENT.statHighScore,
      value: skorTertinggi,
      icon: Trophy,
      card: "lg:bg-sky-700",
      iconBg: "bg-sky-100 text-sky-800 lg:bg-white/15 lg:text-white",
      valueColor: "text-purple-950 lg:text-white",
      labelColor: "text-sky-700 lg:text-white/80",
    },
  ] as const;

  return (
    <div className="min-h-full bg-[#F7F5FC]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-6 lg:px-8 lg:py-8 xl:px-10">
        <header>
          <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-purple-950 sm:text-[2.15rem] lg:text-[2rem]">
            {TEXT_CONTENT.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base lg:text-sm">
            {TEXT_CONTENT.subtitle}
          </p>
        </header>

        {/* ── STAT CARDS ── */}
        {totalUjian > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {STAT_CARDS.map((s) => (
            <div
              key={s.label}
              className={`flex flex-row items-center gap-3 rounded-2xl border border-purple-100 bg-white px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:gap-3 lg:border-transparent lg:px-4 lg:py-3 lg:text-white lg:shadow-none ${s.card}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-14 sm:rounded-2xl lg:size-9 lg:rounded-lg ${s.iconBg}`}>
                <s.icon className="size-5 sm:size-6 lg:size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className={`block text-xs font-semibold leading-tight sm:text-sm lg:text-xs ${s.labelColor}`}>
                  {s.label}
                </span>
                <span className={`mt-0.5 block truncate text-xl font-extrabold tracking-tight sm:text-[1.75rem] lg:text-2xl ${s.valueColor}`}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
          </div>
        )}

      {/* ── TABEL / EMPTY STATE ── */}
      {totalUjian === 0 ? (
        <Card className="w-full gap-0 rounded-2xl border border-purple-100 bg-white py-8 shadow-none ring-0 lg:py-7">
          <CardContent className="flex flex-col items-center justify-center p-0 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-primary lg:size-9">
              <FileText className="size-5 lg:size-4" aria-hidden />
            </span>
            <p className="mt-3 font-bold text-purple-950">
              {TEXT_CONTENT.emptyStateTitle}
            </p>
            <p className="mx-auto mt-1 max-w-sm px-4 text-sm text-muted-foreground lg:text-xs">
              {TEXT_CONTENT.emptyStateDesc}
            </p>
            <Button
              asChild
              className="mt-5 h-10 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-purple-800"
            >
              <Link href={ROUTES.packages}>
                {TEXT_CONTENT.emptyStateBtn}
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-none ring-0">
          {/* Card header */}
          <CardHeader className="border-b border-purple-200 bg-purple-50 px-4 md:px-5 py-3 md:py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-bold text-purple-900">
                {TEXT_CONTENT.tableHeaderSummary(totalUjian)}
              </span>
            </div>
          </CardHeader>

          {/* Menambahkan wrapper overflow-x-auto agar tabel responsif di mobile */}
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-200">
              <Table>
                <TableHeader className="bg-purple-50/60">
                  <TableRow className="border-b border-purple-200 hover:bg-transparent">
                    <TableHead className="font-bold text-purple-900 whitespace-nowrap px-4">{TEXT_CONTENT.thPackage}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-2">{TEXT_CONTENT.thTwk}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-2">{TEXT_CONTENT.thTiu}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-2">{TEXT_CONTENT.thTkp}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-4">{TEXT_CONTENT.thTotal}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-4">{TEXT_CONTENT.thStatus}</TableHead>
                    <TableHead className="text-right font-bold text-purple-900 px-4">{TEXT_CONTENT.thDate}</TableHead>
                    <TableHead className="text-center font-bold text-purple-900 px-4">{TEXT_CONTENT.thAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.map((item) => (
                    <TableRow key={item.id} className="border-b border-purple-200/40 hover:bg-purple-50/40">
                      <TableCell className="px-4">
                        <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {item.packageTitle}
                        </p>
                      </TableCell>

                      {/* Skor TWK */}
                      <TableCell className="text-center px-2">
                        <span className={`text-sm font-bold ${
                          item.skorTwk >= EXAM_THRESHOLDS.passingGrade.twk
                            ? "text-teal-600"
                            : "text-red-600"
                        }`}>
                          {item.skorTwk}
                        </span>
                      </TableCell>

                      {/* Skor TIU */}
                      <TableCell className="text-center px-2">
                        <span className={`text-sm font-bold ${
                          item.skorTiu >= EXAM_THRESHOLDS.passingGrade.tiu
                            ? "text-teal-600"
                            : "text-red-600"
                        }`}>
                          {item.skorTiu}
                        </span>
                      </TableCell>

                      {/* Skor TKP */}
                      <TableCell className="text-center px-2">
                        <span className={`text-sm font-bold ${
                          item.skorTkp >= EXAM_THRESHOLDS.passingGrade.tkp
                            ? "text-teal-600"
                            : "text-red-600"
                        }`}>
                          {item.skorTkp}
                        </span>
                      </TableCell>

                      {/* Total skor */}
                      <TableCell className="text-center px-4">
                        <span className="text-base font-extrabold text-foreground">
                          {item.totalSkor}
                        </span>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="text-center px-4">
                        {item.isLolos ? (
                          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                            <CheckCircle2 className="h-3 w-3" />
                            {TEXT_CONTENT.badgePassed}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 rounded-md bg-red-400 px-2.5 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                            <XCircle className="h-3 w-3" />
                            {TEXT_CONTENT.badgeFailed}
                          </span>
                        )}
                      </TableCell>

                      {/* Tanggal */}
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap px-4">
                        {formatTanggal(item.endTime)}
                      </TableCell>

                      {/* Tombol detail */}
                      <TableCell className="text-center px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="gap-1 text-primary hover:bg-purple-50 hover:text-purple-800 font-semibold whitespace-nowrap"
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FOOTER PASSING GRADE ── */}
      {totalUjian > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border border-purple-100 bg-white px-4 py-3 text-xs text-muted-foreground">
          <span className="w-full text-center font-semibold text-purple-900 sm:w-auto">{TEXT_CONTENT.footerThresholds}</span>
          <span className="font-bold text-purple-800">TWK ≥ {EXAM_THRESHOLDS.passingGrade.twk}</span>
          <span className="hidden text-purple-200 sm:inline">·</span>
          <span className="font-bold text-purple-800">TIU ≥ {EXAM_THRESHOLDS.passingGrade.tiu}</span>
          <span className="hidden text-purple-200 sm:inline">·</span>
          <span className="font-bold text-purple-800">TKP ≥ {EXAM_THRESHOLDS.passingGrade.tkp}</span>
        </div>
      )}

      </div>
    </div>
  );
}
