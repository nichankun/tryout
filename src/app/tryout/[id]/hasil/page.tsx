/**
 * app/tryout/[id]/hasil/page.tsx
 *
 * Mengubah halaman hasil menjadi Async Server Component dinamis.
 * Menarik data hasil tryout asli dari PostgreSQL (Drizzle ORM) berdasarkan
 * user yang sedang login (NextAuth session) dan packageId (params id).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, BarChart3, FileText } from "lucide-react";

// ── IMPORT AUTH & DRIZZLE DATABASE ──
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories } from "@/db/database/schema"; // Sesuaikan jika path schema Anda berbeda
import { and, eq, desc } from "drizzle-orm";

interface HasilPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: HasilPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Hasil Tryout SKD Vol. ${id} — ASNPedia`,
    description: "Analisis nilai dan performa ujian SKD CPNS.",
  };
}

// ── Tipe data ──
interface StatistikSubtest {
  singkatan: "TWK" | "TIU" | "TKP";
  kategori: string;
  skor: number;
  passingGrade: number;
  maksimal: number;
  status: boolean;
  keterangan: string;
}

export default async function HasilTryoutPage({ params }: HasilPageProps) {
  const { id } = await params;

  // Validasi id sebelum dipakai
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > 20) notFound();

  // 1. PROTEKSI HALAMAN VIA SERVER-SIDE AUTH
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${volumeId}/hasil`);
  }

  // 2. TARIK DATA RIWAYAT TERBARU DARI DATABASE
  // Diambil data percobaan terakhir milik user ini pada paket tryout terkait
  const riwayatList = await db
    .select()
    .from(tryoutHistories)
    .where(
      and(
        eq(tryoutHistories.userId, session.user.id),
        eq(tryoutHistories.packageId, volumeId)
      )
    )
    .orderBy(desc(tryoutHistories.endTime))
    .limit(1);

  const riwayatTerbaru = riwayatList[0];

  // Jika user belum pernah submit/mengerjakan paket ini, lemparkan ke halaman 404
  if (!riwayatTerbaru) {
    notFound();
  }

  // 3. RETRIEVE DATA NILAI RIIL DARI DATABASE
  const nilaiSiswa = { 
    twk: riwayatTerbaru.skorTwk, 
    tiu: riwayatTerbaru.skorTiu, 
    tkp: riwayatTerbaru.skorTkp 
  };
  
  const passingGrade = { twk: 65, tiu: 80, tkp: 166 };
  const skorMaksimal = { twk: 150, tiu: 175, tkp: 225 };

  const totalSkor = nilaiSiswa.twk + nilaiSiswa.tiu + nilaiSiswa.tkp;
  const isLolosTWK = nilaiSiswa.twk >= passingGrade.twk;
  const isLolosTIU = nilaiSiswa.tiu >= passingGrade.tiu;
  const isLolosTKP = nilaiSiswa.tkp >= passingGrade.tkp;
  const isLolosSKD = isLolosTWK && isLolosTIU && isLolosTKP;

  const statistikDetail: StatistikSubtest[] = [
    {
      singkatan: "TWK",
      kategori: "Tes Wawasan Kebangsaan",
      skor: nilaiSiswa.twk,
      passingGrade: passingGrade.twk,
      maksimal: skorMaksimal.twk,
      status: isLolosTWK,
      keterangan: "Nasionalisme, Integritas, Bela Negara, Pilar Negara, Bahasa Indonesia.",
    },
    {
      singkatan: "TIU",
      kategori: "Tes Inteligensia Umum",
      skor: nilaiSiswa.tiu,
      passingGrade: passingGrade.tiu,
      maksimal: skorMaksimal.tiu,
      status: isLolosTIU,
      keterangan: "Kemampuan Verbal, Numerik, dan Figural.",
    },
    {
      singkatan: "TKP",
      kategori: "Tes Karakteristik Pribadi",
      skor: nilaiSiswa.tkp,
      passingGrade: passingGrade.tkp,
      maksimal: skorMaksimal.tkp,
      status: isLolosTKP,
      keterangan: "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, TI, Profesionalisme, Anti Radikalisme.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Navigasi atas */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-xl gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4" aria-hidden /> Kembali ke Dashboard
            </Link>
          </Button>
          <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full">
            ID Ujian: #SKD-{volumeId}
          </span>
        </div>

        {/* Banner Status Kelulusan */}
        <Card className={`rounded-2xl border-2 shadow-sm overflow-hidden ${
          isLolosSKD
            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
            : "border-red-200 bg-red-50/30 dark:bg-red-950/10"
        }`}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center">
              {isLolosSKD
                ? <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" aria-hidden />
                : <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" aria-hidden />
              }
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                {isLolosSKD ? "SELAMAT! KAMU MEMENUHI PASSING GRADE" : "BELUM MEMENUHI PASSING GRADE"}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                {isLolosSKD
                  ? "Nilai kamu di seluruh kategori telah melewati ambang batas minimal yang ditentukan BKN."
                  : "Masih ada kategori yang berada di bawah ambang batas minimal. Evaluasi dan terus latihan!"}
              </p>
            </div>

            <div className="inline-block bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-6 py-3 rounded-2xl shadow-sm">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Skor SKD</p>
              <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{totalSkor}</p>
            </div>
          </CardContent>
        </Card>

        {/* Ringkasan Per Kategori */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statistikDetail.map((item) => {
            const persentase = Math.round((item.skor / item.maksimal) * 100);
            return (
              <Card key={item.singkatan} className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {item.singkatan}
                    </CardTitle>
                    <CardDescription className="text-xs">Ambang batas: {item.passingGrade}</CardDescription>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    item.status
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50"
                      : "text-red-600 bg-red-50 dark:bg-red-950/50"
                  }`}>
                    {item.status ? "Lolos" : "Gagal"}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{item.skor}</span>
                    <span className="text-xs text-slate-400">/ {item.maksimal}</span>
                  </div>
                  <Progress value={persentase} className="h-2 rounded-full" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabel Analisis Detail */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" aria-hidden />
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Analisis Nilai Detail
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="font-bold">Materi Uji</TableHead>
                  <TableHead className="text-center font-bold">Skor Kamu</TableHead>
                  <TableHead className="text-center font-bold">Passing Grade</TableHead>
                  <TableHead className="text-center font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistikDetail.map((item) => (
                  <TableRow key={item.singkatan} className="hover:bg-transparent">
                    <TableCell className="py-4 font-medium">
                      <p className="text-slate-800 dark:text-slate-200 font-bold">
                        {item.kategori} ({item.singkatan})
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-md">
                        {item.keterangan}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-base font-black text-slate-800 dark:text-slate-100">
                      {item.skor}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-500">
                      {item.passingGrade}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex justify-center">
                        {item.status
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-label="Lolos" />
                          : <AlertCircle className="w-5 h-5 text-red-500" aria-label="Tidak lolos" />
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2" asChild>
            <Link href={`/tryout/${volumeId}/pembahasan`}>
              <FileText className="w-5 h-5" aria-hidden /> Lihat Pembahasan Soal
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl font-bold" asChild>
            <Link href="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        </div>

      </div>
    </div>
  );
}