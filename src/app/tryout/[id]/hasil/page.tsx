/**
 * app/tryout/[id]/hasil/page.tsx
 * * Async Server Component dinamis untuk menampilkan hasil analisis tryout SKD.
 * Menghubungkan PostgreSQL via Drizzle ORM dengan NextAuth v5 session.
 * Sudah dioptimalkan dengan deteksi searchParams historyId untuk akurasi data.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, BarChart3, FileText } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories } from "@/db/database/schema"; 
import { and, eq, desc, SQL } from "drizzle-orm";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  maxVolumeAllowed: 20,
} as const;

const EXAM_THRESHOLDS = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
  maxScore: { twk: 150, tiu: 175, tkp: 225 },
} as const;

const ROUTES = {
  loginRedirect: (id: number) => `/login?callbackUrl=/tryout/${id}/hasil`,
  pembahasan: (id: number) => `/tryout/${id}/pembahasan`,
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  metaTitle: (id: string) => `Hasil Tryout SKD Vol. ${id} — ${APP_CONFIG.name}`,
  metaDesc: "Analisis nilai dan performa ujian SKD CPNS.",
  examIdPrefix: "ID Ujian: #SKD-",
  statusPassed: "SELAMAT! KAMU MEMENUHI PASSING GRADE",
  statusFailed: "BELUM MEMENUHI PASSING GRADE",
  descPassed: "Nilai kamu di seluruh kategori telah melewati ambang batas minimal yang ditentukan BKN.",
  descFailed: "Masih ada kategori yang berada di bawah ambang batas minimal. Evaluasi dan terus latihan!",
  totalScoreLabel: "Total Skor SKD",
  analysisTitle: "Analisis Nilai Detail",
  tableHeaderSubject: "Materi Uji",
  tableHeaderYourScore: "Skor Kamu",
  tableHeaderPassingGrade: "Passing Grade",
  tableHeaderStatus: "Status",
  actionPembahasan: "Lihat Pembahasan Soal",
  actionDashboard: "Kembali ke Dashboard",
  badgePassed: "Lolos",
  badgeFailed: "Gagal",
  thresholdLabel: "Ambang batas:",
} as const;

// ── INTERFACES ──
interface HasilPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyId?: string }>; // ✅ Menangkap query ?historyId=... dari URL
}

interface StatistikSubtest {
  singkatan: "TWK" | "TIU" | "TKP";
  kategori: string;
  skor: number;
  passingGrade: number;
  maksimal: number;
  status: boolean;
  keterangan: string;
}

// ==========================================
// GENERATE METADATA DYNAMIC
// ==========================================
export async function generateMetadata({ params }: HasilPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: TEXT_CONTENT.metaTitle(id),
    description: TEXT_CONTENT.metaDesc,
  };
}

// ==========================================
// KOMPONEN UTAMA (SERVER COMPONENT)
// ==========================================
export default async function HasilTryoutPage({ params, searchParams }: HasilPageProps) {
  const { id } = await params;
  const { historyId } = await searchParams; // ✅ Resolve searchParams di server

  // Validasi parameter ID Volume paket tryout
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > APP_CONFIG.maxVolumeAllowed) notFound();

  // 1. Proteksi Halaman Sisi Server (Server-Side Auth)
  const session = await auth();
  if (!session?.user?.id) {
    redirect(ROUTES.loginRedirect(volumeId));
  }

  // 2. Merakit Kueri Kondisional Berbasis Drizzle
  const queryConditions: SQL[] = [
    eq(tryoutHistories.userId, session.user.id),
    eq(tryoutHistories.packageId, volumeId)
  ];

  // Jika di URL ada historyId yang spesifik, kunci pencarian ke ID tersebut
  if (historyId) {
    queryConditions.push(eq(tryoutHistories.id, historyId));
  }

  // Tarik Data Riwayat Ujian dari Database PostgreSQL
  const riwayatList = await db
    .select()
    .from(tryoutHistories)
    .where(and(...queryConditions))
    .orderBy(desc(tryoutHistories.endTime))
    .limit(1);

  const riwayatTerbaru = riwayatList[0];

  // Batasi akses jika data riwayat pengerjaan tidak ditemukan
  if (!riwayatTerbaru) notFound();

  // 3. Mapping Data Komponen Nilai Riil
  const nilaiSiswa = { 
    twk: riwayatTerbaru.skorTwk, 
    tiu: riwayatTerbaru.skorTiu, 
    tkp: riwayatTerbaru.skorTkp 
  };
  
  const totalSkor = nilaiSiswa.twk + nilaiSiswa.tiu + nilaiSiswa.tkp;
  const isLolosTWK = nilaiSiswa.twk >= EXAM_THRESHOLDS.passingGrade.twk;
  const isLolosTIU = nilaiSiswa.tiu >= EXAM_THRESHOLDS.passingGrade.tiu;
  const isLolosTKP = nilaiSiswa.tkp >= EXAM_THRESHOLDS.passingGrade.tkp;
  const isLolosSKD = isLolosTWK && isLolosTIU && isLolosTKP;

  const statistikDetail: StatistikSubtest[] = [
    {
      singkatan: "TWK",
      kategori: "Tes Wawasan Kebangsaan",
      skor: nilaiSiswa.twk,
      passingGrade: EXAM_THRESHOLDS.passingGrade.twk,
      maksimal: EXAM_THRESHOLDS.maxScore.twk,
      status: isLolosTWK,
      keterangan: "Nasionalisme, Integritas, Bela Negara, Pilar Negara, Bahasa Indonesia.",
    },
    {
      singkatan: "TIU",
      kategori: "Tes Inteligensia Umum",
      skor: nilaiSiswa.tiu,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tiu,
      maksimal: EXAM_THRESHOLDS.maxScore.tiu,
      status: isLolosTIU,
      keterangan: "Kemampuan Verbal, Numerik, dan Figural.",
    },
    {
      singkatan: "TKP",
      kategori: "Tes Karakteristik Pribadi",
      skor: nilaiSiswa.tkp,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tkp,
      maksimal: EXAM_THRESHOLDS.maxScore.tkp,
      status: isLolosTKP,
      keterangan: "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, TI, Profesionalisme, Anti Radikalisme.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* HEADER BAR NAVIGASI */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-xl gap-2 text-muted-foreground hover:text-foreground">
            <Link href={ROUTES.dashboard}>
              <ArrowLeft className="w-4 h-4" aria-hidden /> {TEXT_CONTENT.actionDashboard}
            </Link>
          </Button>
          <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border">
            {TEXT_CONTENT.examIdPrefix}{riwayatTerbaru.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* SPANDUK UTAMA BANNER KELULUSAN */}
        <Card className={`rounded-2xl border-2 shadow-sm overflow-hidden ${
          isLolosSKD
            ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
            : "border-destructive/20 bg-destructive/5"
        }`}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 flex items-center justify-center">
              {isLolosSKD
                ? <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                : <XCircle className="w-12 h-12 text-destructive" />
              }
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {isLolosSKD ? TEXT_CONTENT.statusPassed : TEXT_CONTENT.statusFailed}
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {isLolosSKD ? TEXT_CONTENT.descPassed : TEXT_CONTENT.descFailed}
              </p>
            </div>

            <div className="bg-card border border-border inline-block px-6 py-3 rounded-2xl shadow-sm">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{TEXT_CONTENT.totalScoreLabel}</p>
              <p className="text-4xl font-black text-primary">{totalSkor}</p>
            </div>
          </CardContent>
        </Card>

        {/* GRID RINGKASAN DATA SUBTEST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statistikDetail.map((item) => {
            const persentase = Math.round((item.skor / item.maksimal) * 100);
            return (
              <Card key={item.singkatan} className="rounded-2xl border-border bg-card shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-foreground">
                      {item.singkatan}
                    </CardTitle>
                    <CardDescription className="text-xs">{TEXT_CONTENT.thresholdLabel} {item.passingGrade}</CardDescription>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    item.status
                      ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                      : "text-destructive bg-destructive/10"
                  }`}>
                    {item.status ? TEXT_CONTENT.badgePassed : TEXT_CONTENT.badgeFailed}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-foreground">{item.skor}</span>
                    <span className="text-xs text-muted-foreground">/ {item.maksimal}</span>
                  </div>
                  <Progress value={persentase} className="h-2 rounded-full" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* TABEL ANALISIS DIAGNOSIS MATERI DETAIL */}
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" aria-hidden />
              <CardTitle className="text-lg font-bold text-foreground">
                {TEXT_CONTENT.analysisTitle}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border">
                  <TableHead className="font-bold text-foreground">{TEXT_CONTENT.tableHeaderSubject}</TableHead>
                  <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.tableHeaderYourScore}</TableHead>
                  <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.tableHeaderPassingGrade}</TableHead>
                  <TableHead className="text-center font-bold text-foreground">{TEXT_CONTENT.tableHeaderStatus}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistikDetail.map((item) => (
                  <TableRow key={item.singkatan} className="border-b border-border/60 hover:bg-transparent">
                    <TableCell className="py-4 font-medium">
                      <p className="text-foreground font-bold">
                        {item.kategori} ({item.singkatan})
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                        {item.keterangan}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-base font-black text-foreground">
                      {item.skor}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-muted-foreground">
                      {item.passingGrade}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex justify-center">
                        {item.status
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          : <AlertCircle className="w-5 h-5 text-destructive" />
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* TOMBOL AKSI UTAMA FOOTER */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="rounded-xl font-bold gap-2" asChild>
            <Link href={ROUTES.pembahasan(volumeId)}>
              <FileText className="w-5 h-5" aria-hidden /> {TEXT_CONTENT.actionPembahasan}
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl font-bold" asChild>
            <Link href={ROUTES.dashboard}>{TEXT_CONTENT.actionDashboard}</Link>
          </Button>
        </div>

      </div>
    </div>
  );
}