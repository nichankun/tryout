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
import { questions, tryoutHistories } from "@/db/database/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { SKD_TRAINING_THRESHOLDS } from "@/lib/constants/scoring";

// ==========================================
// KONFIGURASI & TIPE DATA
// ==========================================
const APP_CONFIG = { name: "ASNPedia" } as const;
const ChoicesSchema = z.array(z.object({ poin: z.number() }));

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
  if (maks <= 0) return 0;
  return Math.min(100, Math.round((skor / maks) * 100));
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function HasilTryoutPage({ params, searchParams }: HasilPageProps) {
  const [p, sp, session] = await Promise.all([params, searchParams, auth()]);

  const volumeId = parseInt(p.id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${p.id}/hasil`);
  }

  // Ambil riwayat berdasarkan historyId (jika ada) atau pengerjaan terbaru
  const [riwayat, packageQuestions] = await Promise.all([
    db.query.tryoutHistories.findFirst({
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
    }),
    db.select({ kategori: questions.kategori, pilihan: questions.pilihan })
      .from(questions)
      .where(eq(questions.packageId, volumeId)),
  ]);

  if (!riwayat) notFound();

  const maxScores = { twk: 0, tiu: 0, tkp: 0 };
  for (const question of packageQuestions) {
    const parsedChoices = ChoicesSchema.safeParse(question.pilihan);
    if (!parsedChoices.success) continue;
    const maximum = Math.max(0, ...parsedChoices.data.map((choice) => choice.poin));
    if (question.kategori === "TWK") maxScores.twk += maximum;
    else if (question.kategori === "TIU") maxScores.tiu += maximum;
    else if (question.kategori === "TKP") maxScores.tkp += maximum;
  }

  const statistikDetail: StatistikSubtest[] = [
    {
      singkatan: "TWK",
      kategori: "Tes Wawasan Kebangsaan",
      skor: riwayat.skorTwk,
      passingGrade: SKD_TRAINING_THRESHOLDS.twk,
      maksimal: maxScores.twk,
      status: riwayat.skorTwk >= SKD_TRAINING_THRESHOLDS.twk,
      keterangan: "Nasionalisme, Integritas, Bela Negara, Pilar Negara, Bahasa Indonesia.",
    },
    {
      singkatan: "TIU",
      kategori: "Tes Inteligensia Umum",
      skor: riwayat.skorTiu,
      passingGrade: SKD_TRAINING_THRESHOLDS.tiu,
      maksimal: maxScores.tiu,
      status: riwayat.skorTiu >= SKD_TRAINING_THRESHOLDS.tiu,
      keterangan: "Kemampuan Verbal, Numerik, dan Figural.",
    },
    {
      singkatan: "TKP",
      kategori: "Tes Karakteristik Pribadi",
      skor: riwayat.skorTkp,
      passingGrade: SKD_TRAINING_THRESHOLDS.tkp,
      maksimal: maxScores.tkp,
      status: riwayat.skorTkp >= SKD_TRAINING_THRESHOLDS.tkp,
      keterangan: "Pelayanan Publik, Jejaring Kerja, Sosial Budaya, TI, Profesionalisme.",
    },
  ];

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 md:gap-8 md:px-6 md:py-10">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3 md:gap-4">
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
          className="shrink-0 border-purple-200 bg-purple-50 px-2 py-1 font-mono text-[10px] tracking-wider text-primary md:px-2.5 md:text-[11px]"
        >
          ID: #{riwayat.id.toString().slice(0, 8).toUpperCase()}
        </Badge>
      </div>

      {/* ── STATUS BANNER ── */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 text-center md:p-10 ${
          riwayat.isLolos
            ? "border-teal-200 bg-teal-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        {/* Icon */}
        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full md:mb-5 md:h-16 md:w-16 ${
            riwayat.isLolos ? "bg-teal-400" : "bg-red-400"
          }`}
        >
          {riwayat.isLolos ? (
            <CheckCircle2 className="h-6 w-6 text-white md:h-8 md:w-8" aria-hidden />
          ) : (
            <XCircle className="h-6 w-6 text-white md:h-8 md:w-8" aria-hidden />
          )}
        </div>

        {/* Judul status */}
        <h2
          className={`text-lg font-bold tracking-tight md:text-2xl ${
            riwayat.isLolos ? "text-teal-900" : "text-red-900"
          }`}
        >
          {riwayat.isLolos ? "Target latihan tercapai" : "Target latihan belum tercapai"}
        </h2>
        <p
          className={`mt-1.5 text-sm ${
            riwayat.isLolos ? "text-teal-600" : "text-red-600"
          }`}
        >
          {riwayat.isLolos
            ? "Skor kamu mencapai target latihan yang dipakai aplikasi."
            : "Skor kamu masih di bawah target latihan yang dipakai aplikasi."}
        </p>

        {/* Divider */}
        <div
          className={`mx-auto my-3 h-px w-10 md:my-5 md:w-12 ${
            riwayat.isLolos ? "bg-teal-200" : "bg-red-200"
          }`}
        />

        {/* Total skor */}
        <div
          className={`font-mono text-5xl font-semibold tracking-tighter md:text-6xl ${
            riwayat.isLolos ? "text-teal-800" : "text-red-800"
          }`}
        >
          {riwayat.totalSkor}
        </div>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:mt-2 md:text-[11px]">
          Total Skor SKD
        </p>
      </div>

      {/* ── ANALISIS SUBTEST ── */}
      <Card className="gap-0 overflow-hidden border-purple-200 py-0">
        <CardHeader className="border-b border-purple-200 bg-purple-50 px-4 py-3.5 md:px-5">
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
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2.5 px-4 py-4 transition-colors hover:bg-purple-50/30 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-6 md:px-5 md:py-5"
              >
                {/* Keterangan subtes */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      {item.singkatan}
                    </span>
                    <span className="min-w-0 text-sm font-semibold text-foreground">
                      {item.kategori}
                    </span>
                    </div>
                    <span className={`shrink-0 font-mono text-xl font-bold md:hidden ${
                      item.status ? "text-teal-600" : "text-red-600"
                    }`}>
                      {item.skor}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground md:mt-2">
                    {item.keterangan}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2.5 flex flex-col gap-1 md:mt-3">
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
                      <span className="text-primary">Target: {item.passingGrade}</span>
                      <span>{item.maksimal}</span>
                    </div>
                  </div>
                </div>

                {/* Tengah: skor */}
                <div className="hidden flex-col items-end md:flex">
                  <span
                    className={`font-mono text-2xl font-bold ${
                      item.status ? "text-teal-600" : "text-red-600"
                    }`}
                  >
                    {item.skor}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    dari {item.maksimal} · target {item.passingGrade}
                  </span>
                </div>

                {/* Kanan: badge */}
                <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-start">
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
                  <span className="shrink-0 text-right text-[10px] text-muted-foreground md:hidden">
                    dari {item.maksimal} · target {item.passingGrade}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── FOOTER PASSING GRADE ── */}
      <div className="grid grid-cols-3 items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-3 text-xs text-primary md:flex md:flex-wrap md:justify-center md:gap-3 md:px-6">
        <span className="col-span-3 text-center font-semibold md:w-auto">Target nilai latihan:</span>
        <span className="rounded-lg bg-white/70 px-2 py-2 text-center font-bold md:bg-transparent md:px-0 md:py-0">TWK ≥ {SKD_TRAINING_THRESHOLDS.twk}</span>
        <span className="rounded-lg bg-white/70 px-2 py-2 text-center font-bold md:bg-transparent md:px-0 md:py-0">TIU ≥ {SKD_TRAINING_THRESHOLDS.tiu}</span>
        <span className="rounded-lg bg-white/70 px-2 py-2 text-center font-bold md:bg-transparent md:px-0 md:py-0">TKP ≥ {SKD_TRAINING_THRESHOLDS.tkp}</span>
        <p className="col-span-3 text-center text-[10px] text-muted-foreground md:basis-full md:text-[11px]">Target ini untuk latihan dan bukan ambang seleksi resmi.</p>
      </div>

      {/* ── CTA ── */}
      <div className="flex justify-center pt-1 md:pt-2">
        <Button
          asChild
          size="lg"
          className="h-12 w-full gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-sm hover:bg-purple-800 sm:w-auto sm:px-8"
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
