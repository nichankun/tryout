/**
 * app/tryout/[id]/hasil/page.tsx
 * * Server Component hasil analisis tryout SKD.
 * Dioptimalkan dengan Partial Query dan sinkronisasi historyId untuk pembahasan.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, BarChart3, FileText } from "lucide-react";
import {Badge} from "@/components/ui/badge";
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

  // Mapping data untuk statistik
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
    <div className="min-h-screen bg-background py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
      
          <Badge variant="secondary">ID Ujian: #{riwayat.id.toString().slice(0, 8).toUpperCase()}</Badge>
        </div>

        {/* Status Banner */}
        <Card className={`text-center p-8 border-2 ${riwayat.isLolos ? "border-emerald-500 bg-emerald-500/5" : "border-destructive bg-destructive/5"}`}>
          <div className="flex justify-center mb-4">
            {riwayat.isLolos ? <CheckCircle2 className="w-16 h-16 text-emerald-500" /> : <XCircle className="w-16 h-16 text-destructive" />}
          </div>
          <h1 className="text-3xl font-black">{riwayat.isLolos ? "SELAMAT! LOLOS" : "BELUM LOLOS"}</h1>
          <p className="text-muted-foreground mt-2">{riwayat.isLolos ? "Skor Anda memenuhi standar BKN." : "Perlu latihan lebih lanjut."}</p>
          <div className="mt-6 text-6xl font-black text-primary">{riwayat.totalSkor}</div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mt-1">Total Skor SKD</p>
        </Card>

        {/* Tabel Analisis */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Analisis Nilai</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Materi</TableHead><TableHead>Skor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {statistikDetail.map((item) => (
                  <TableRow key={item.singkatan}>
                    <TableCell><p className="font-bold">{item.kategori}</p><p className="text-xs text-muted-foreground">{item.keterangan}</p></TableCell>
                    <TableCell className="font-mono font-bold text-lg">{item.skor} <span className="text-xs text-muted-foreground">/ {item.maksimal}</span></TableCell>
                    <TableCell>{item.status ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-destructive" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href={`/dashboard/${p.id}/pembahasan?historyId=${riwayat.id}`}>
              <FileText className="w-4 h-4 mr-2" /> Lihat Pembahasan
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}