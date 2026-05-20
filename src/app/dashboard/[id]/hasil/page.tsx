/**
 * app/dashboard/[id]/hasil/page.tsx
 * Server Component hasil analisis tryout SKD.
 * Dioptimalkan dengan Partial Query dan sinkronisasi historyId untuk pembahasan.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
// HELPER: Progress bar persen
// ==========================================
function pct(skor: number, maks: number) {
  return Math.min(100, Math.round((skor / maks) * 100));
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
    },
  });

  if (!riwayat) notFound();

  const statistikDetail: StatistikSubtest[] = [
    {
      singkatan: "TWK",
      kategori: "Tes Wawasan Kebangsaan",
      skor: riwayat.skorTwk,
      passingGrade: EXAM_THRESHOLDS.passingGrade.twk,
      maksimal: EXAM_THRESHOLDS.maxScore.twk,
      status: riwayat.skorTwk >= EXAM_THRESHOLDS.passingGrade.twk,
      keterangan: "Nasionalisme, Integritas, Bela Negara, Pilar Negara, Bahasa Indonesia.",
    },
    {
      singkatan: "TIU",
      kategori: "Tes Inteligensia Umum",
      skor: riwayat.skorTiu,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tiu,
      maksimal: EXAM_THRESHOLDS.maxScore.tiu,
      status: riwayat.skorTiu >= EXAM_THRESHOLDS.passingGrade.tiu,
      keterangan: "Kemampuan Verbal, Numerik, dan Figural.",
    },
    {
      singkatan: "TKP",
      kategori: "Tes Karakteristik Pribadi",
      skor: riwayat.skorTkp,
      passingGrade: EXAM_THRESHOLDS.passingGrade.tkp,
      maksimal: EXAM_THRESHOLDS.maxScore.tkp,
      status: riwayat.skorTkp >= EXAM_THRESHOLDS.passingGrade.tkp,
      keterangan: "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, TI, Profesionalisme.",
    },
  ];

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-10">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 border-l-4 border-primary pl-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Hasil Analisis Ujian
          </h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Volume {volumeId} · {APP_CONFIG.name}
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[11px] tracking-wider bg-purple-50 text-primary border-purple-200"
        >
          ID: #{riwayat.id.toString().slice(0, 8).toUpperCase()}
        </Badge>
      </div>

      {/* ── STATUS BANNER ── */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-8 text-center md:p-10 ${
          riwayat.isLolos
            ? "border-teal-200 bg-teal-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        {/* Icon */}
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            riwayat.isLolos ? "bg-teal-400" : "bg-red-400"
          }`}
        >
          {riwayat.isLolos ? (
            <CheckCircle2 className="h-8 w-8 text-white" aria-hidden />
          ) : (
            <XCircle className="h-8 w-8 text-white" aria-hidden />
          )}
        </div>

        {/* Judul status */}
        <h2
          className={`text-xl font-bold tracking-tight md:text-2xl ${
            riwayat.isLolos ? "text-teal-900" : "text-red-900"
          }`}
        >
          {riwayat.isLolos ? "Selamat! Kamu lolos" : "Belum lolos kriteria"}
        </h2>
        <p
          className={`mt-1.5 text-sm ${
            riwayat.isLolos ? "text-teal-600" : "text-red-600"
          }`}
        >
          {riwayat.isLolos
            ? "Skor kamu memenuhi ambang batas standar BKN."
            : "Skor belum memenuhi passing grade minimum."}
        </p>

        {/* Divider */}
        <div
          className={`mx-auto my-5 h-px w-12 ${
            riwayat.isLolos ? "bg-teal-200" : "bg-red-200"
          }`}
        />

        {/* Total skor */}
        <div
          className={`font-mono text-6xl font-bold tracking-tighter md:text-7xl ${
            riwayat.isLolos ? "text-teal-800" : "text-red-800"
          }`}
        >
          {riwayat.totalSkor}
        </div>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Total Skor SKD
        </p>
      </div>

      {/* ── ANALISIS SUBTEST ── */}
      <Card className="overflow-hidden border-purple-200">
        <CardHeader className="border-b border-purple-200 bg-purple-50 px-5 py-3.5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-purple-900">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            Analisis Capaian Nilai
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-purple-200/40 p-0">
          {statistikDetail.map((item) => {
            const barPct = pct(item.skor, item.maksimal);
            const pgPct  = pct(item.passingGrade, item.maksimal);

            return (
              <div
                key={item.singkatan}
                className="grid grid-cols-1 gap-4 px-5 py-5 transition-colors hover:bg-purple-50/30 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                {/* Kiri: label + bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {item.singkatan}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {item.kategori}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.keterangan}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-purple-200/30">
                      {/* Fill */}
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full ${
                          item.status ? "bg-teal-400" : "bg-red-400"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                      {/* Passing grade marker */}
                      <div
                        className="absolute top-0 h-full w-px bg-primary"
                        style={{ left: `${pgPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0</span>
                      <span className="text-primary">PG: {item.passingGrade}</span>
                      <span>{item.maksimal}</span>
                    </div>
                  </div>
                </div>

                {/* Tengah: skor */}
                <div className="flex flex-col items-end md:items-end">
                  <span
                    className={`font-mono text-2xl font-bold ${
                      item.status ? "text-teal-600" : "text-red-600"
                    }`}
                  >
                    {item.skor}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    dari {item.maksimal} · min. {item.passingGrade}
                  </span>
                </div>

                {/* Kanan: badge */}
                <div>
                  {item.status ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Memenuhi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Di bawah target
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── FOOTER PASSING GRADE ── */}
      <div className="flex flex-wrap justify-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-6 py-3 text-xs text-primary">
        <span className="font-semibold">Passing grade BKN:</span>
        <span className="font-bold">TWK ≥ {EXAM_THRESHOLDS.passingGrade.twk}</span>
        <span className="text-purple-200">·</span>
        <span className="font-bold">TIU ≥ {EXAM_THRESHOLDS.passingGrade.tiu}</span>
        <span className="text-purple-200">·</span>
        <span className="font-bold">TKP ≥ {EXAM_THRESHOLDS.passingGrade.tkp}</span>
      </div>

      {/* ── CTA ── */}
      <div className="flex justify-center pt-2">
        <Button
          asChild
          size="lg"
          className="gap-2 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-sm hover:bg-purple-800"
        >
          <Link href={`/dashboard/${p.id}/pembahasan?historyId=${riwayat.id}`}>
            <FileText className="h-4 w-4" />
            Lihat Pembahasan Soal
          </Link>
        </Button>
      </div>

    </div>
  );
}