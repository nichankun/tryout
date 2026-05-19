/**
 * app/dashboard/[id]/hasil/page.tsx
 * * Server Component hasil analisis tryout SKD.
 * Dioptimalkan dengan Partial Query dan sinkronisasi historyId untuk pembahasan.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, BarChart3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories } from "@/db/database/schema"; 
import { and, eq, desc } from "drizzle-orm";

// ==========================================
// KONFIGURASI & TIPE DATA
// ==========================================
const APP_CONFIG = { name: "ASNPedia", maxVolumeAllowed: 20 } as const;

const EXAM_THRESHOLDS = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
  maxScore: { twk: 150, tiu: 175, tkp: 225 },
} as const;

interface HasilPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyId?: string }>;
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
// METADATA
// ==========================================
export async function generateMetadata({ params }: HasilPageProps): Promise<Metadata> {
  const p = await params;
  return { title: `Hasil Tryout Vol. ${p.id} — ${APP_CONFIG.name}` };
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function HasilTryoutPage({ params, searchParams }: HasilPageProps) {
  const [p, sp, session] = await Promise.all([params, searchParams, auth()]);
  
  const volumeId = parseInt(p.id, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > APP_CONFIG.maxVolumeAllowed) notFound();
  
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${p.id}/hasil`);
  }

  // Ambil riwayat berdasarkan historyId (jika ada) atau pengerjaan terbaru
  const riwayat = await db.query.tryoutHistories.findFirst({
    where: and(
      eq(tryoutHistories.userId, session.user.id),
      eq(tryoutHistories.packageId, volumeId),
      sp.historyId ? eq(tryoutHistories.id, sp.historyId) : undefined
    ),
    orderBy: [desc(tryoutHistories.endTime)],
    columns: {
      id: true,
      skorTwk: true,
      skorTiu: true,
      skorTkp: true,
      totalSkor: true,
      isLolos: true,
    }
  });

  if (!riwayat) notFound();

  const statistikDetail: StatistikSubtest[] = [
    {
      singkatan: "TWK", kategori: "Tes Wawasan Kebangsaan", skor: riwayat.skorTwk,
      passingGrade: EXAM_THRESHOLDS.passingGrade.twk, maksimal: EXAM_THRESHOLDS.maxScore.twk,
      status: riwayat.skorTwk >= EXAM_THRESHOLDS.passingGrade.twk,
      keterangan: "Nasionalisme, Integritas, Bela Negara, Pilar Negara, Bahasa Indonesia."
    },
    {
      singkatan: "TIU", kategori: "Tes Inteligensia Umum", skor: riwayat.skorTiu,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tiu, maksimal: EXAM_THRESHOLDS.maxScore.tiu,
      status: riwayat.skorTiu >= EXAM_THRESHOLDS.passingGrade.tiu,
      keterangan: "Kemampuan Verbal, Numerik, dan Figural."
    },
    {
      singkatan: "TKP", kategori: "Tes Karakteristik Pribadi", skor: riwayat.skorTkp,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tkp, maksimal: EXAM_THRESHOLDS.maxScore.tkp,
      status: riwayat.skorTkp >= EXAM_THRESHOLDS.passingGrade.tkp,
      keterangan: "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, TI, Profesionalisme."
    },
  ];

  return (
    // PERBAIKAN 1: Menggunakan kontainer standar dengan padding px-4 md:px-6 untuk mencegah mepet pinggir layar
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-10">
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl text-foreground">Hasil Analisis Ujian</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Volume {volumeId} · {APP_CONFIG.name}</p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px] bg-muted/50 tracking-wider">
          ID: #{riwayat.id.toString().slice(0, 8).toUpperCase()}
        </Badge>
      </div>

      {/* Status Banner */}
      {/* PERBAIKAN 2: Mengoptimalkan opacity border & bg agar 100% adaptif terhadap Light/Dark mode */}
      <Card className={`text-center p-6 md:p-8 border bg-card shadow-sm
        ${riwayat.isLolos ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
        <div className="flex justify-center mb-4">
          {riwayat.isLolos ? (
            <CheckCircle2 className="w-14 h-14 md:w-16 md:h-16 text-emerald-500" />
          ) : (
            <XCircle className="w-14 h-14 md:w-16 md:h-16 text-destructive" />
          )}
        </div>
        <h2 className="text-2xl font-black tracking-tight md:text-3xl text-foreground">
          {riwayat.isLolos ? "SELAMAT! LOLOS" : "BELUM LOLOS CRITERIA"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {riwayat.isLolos ? "Skor Anda memenuhi ambang batas standar BKN." : "Skor belum memenuhi ambang batas passing grade minimum."}
        </p>
        <div className="mt-6 text-5xl font-black tracking-tighter text-primary md:text-6xl">
          {riwayat.totalSkor}
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">
          Total Skor SKD
        </p>
      </Card>

      {/* Tabel Analisis */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 py-4 px-5">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <BarChart3 className="w-4 h-4 text-primary"/> Analisis Capaian Nilai
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-foreground pl-5">Materi</TableHead>
                <TableHead className="font-bold text-foreground">Skor Capaian</TableHead>
                <TableHead className="text-center font-bold text-foreground pr-5">Status Kelulusan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statistikDetail.map((item) => (
                <TableRow key={item.singkatan} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-5 py-4">
                    <p className="font-bold text-sm text-foreground">{item.kategori} ({item.singkatan})</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-md leading-relaxed">{item.keterangan}</p>
                  </TableCell>
                  <TableCell className="py-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-base text-foreground">{item.skor}</span>
                    <span className="text-xs text-muted-foreground"> / {item.maksimal}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Target minimum: {item.passingGrade}</p>
                  </TableCell>
                  <TableCell className="text-center pr-5 py-4">
                    <div className="inline-flex items-center justify-center">
                      {item.status ? (
                        <Badge variant="outline" className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Memenuhi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10">
                          <AlertCircle className="w-3 h-3" /> Di Bawah Target
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-center pt-2">
        <Button asChild size="lg" className="font-bold rounded-xl px-8 shadow-sm">
          <Link href={`/dashboard/${p.id}/pembahasan?historyId=${riwayat.id}`}>
            <FileText className="w-4 h-4 mr-2" /> Lihat Pembahasan Soal
          </Link>
        </Button>
      </div>

    </div>
  );
}