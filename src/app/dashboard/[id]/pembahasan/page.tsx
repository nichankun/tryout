/**
 * app/dashboard/[id]/pembahasan/page.tsx
 * * Async Server Component dinamis untuk menampilkan pembahasan tryout SKD.
 * Dioptimalkan dengan Concurrent Promise.all, Partial Query (hanya kolom spesifik), 
 * dan Defensive Parsing untuk performa rendering instan dan keandalan tinggi.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutHistories } from "@/db/database/schema";
import { eq, and, desc, asc, SQL } from "drizzle-orm";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, XCircle, BookOpen } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
} as const;

const ROUTES = {
  login: (id: string) => `/login?callbackUrl=/tryout/${id}/pembahasan`,
  backToResults: (volId: string, historyId?: string) => `/tryout/${volId}/hasil${historyId ? `?historyId=${historyId}` : ""}`,
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  metaTitle: (id: string) => `Pembahasan Tryout SKD Vol. ${id} — ${APP_CONFIG.name}`,
  metaDesc: "Pembahasan lengkap soal dan jawaban tryout SKD CPNS.",
  pageTitle: "Pembahasan Soal",
  pageSubtitle: "Tryout SKD CPNS — Volume",
  unitQuestions: "Soal",
  labelCorrect: "Benar",
  labelIncorrect: "Salah",
  labelEmpty: "Kosong",
  btnNextVol: "Coba Volume Lain",
  explanationHeader: "Pembahasan",
  yourAnswerLabel: "Jawaban kamu:",
  correctAnswerLabel: "Jawaban benar:",
  unansweredPlaceholder: "Tidak dijawab",
} as const;

type SubTest = "TWK" | "TIU" | "TKP";

const SUBTEST_CONFIG: Record<SubTest, { label: string; badgeClass: string }> = {
  TWK: {
    label: "Tes Wawasan Kebangsaan",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  TIU: {
    label: "Tes Inteligensia Umum",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  },
  TKP: {
    label: "Tes Karakteristik Pribadi",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
};

// Skema Zod untuk berjaga-jaga memvalidasi JSONB dari DB
const PilihanSchema = z.array(z.object({ opsi: z.string(), teks: z.string().optional(), poin: z.number() }));

interface PembahasanPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyId?: string }>;
}

// ==========================================
// GENERATE METADATA DYNAMIC
// ==========================================
export async function generateMetadata({ params }: PembahasanPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: TEXT_CONTENT.metaTitle(id),
    description: TEXT_CONTENT.metaDesc,
  };
}

// ==========================================
// KOMPONEN UTAMA (SERVER COMPONENT)
// ==========================================
export default async function PembahasanPage({ params, searchParams }: PembahasanPageProps) {
  // ── 1. PARALLEL RESOLUTION (Params, SearchParams, Auth) ──
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params, 
    searchParams, 
    auth()
  ]);

  const { id } = resolvedParams;
  const { historyId } = resolvedSearchParams;

  if (!session?.user?.id) redirect(ROUTES.login(id));

  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  // ── 2. MERAKIT KONDISI KUERI RIWAYAT ──
  const queryConditions: SQL[] = [
    eq(tryoutHistories.userId, session.user.id),
    eq(tryoutHistories.packageId, volumeId)
  ];
  if (historyId) {
    queryConditions.push(eq(tryoutHistories.id, historyId));
  }

  // ── 3. PARALLEL DATA FETCHING (Riwayat & Soal) ──
  const [history, soalList] = await Promise.all([
    db.query.tryoutHistories.findFirst({
      where: and(...queryConditions),
      orderBy: [desc(tryoutHistories.endTime)],
      columns: { jawabanSiswa: true },
    }),
    db.query.questions.findMany({
      where: eq(questions.packageId, volumeId),
      orderBy: [asc(questions.id)],
      columns: {
        id: true,
        kategori: true,
        pertanyaan: true,
        pembahasan: true,
        pilihan: true,
      },
    })
  ]);

  if (!history || soalList.length === 0) notFound();

  const jawabanSiswa = history.jawabanSiswa || {};

  // ── 4. SINKRONISASI DATA SOAL & HASIL UJIAN SISWA ──
  const enrichedSoal = soalList.map((soal, i) => {
    const parsed = PilihanSchema.safeParse(soal.pilihan);
    const daftarPilihan = parsed.success ? parsed.data : [];
    
    const jawabanBenar = daftarPilihan.length > 0 
      ? daftarPilihan.reduce((a, b) => (a.poin >= b.poin ? a : b)).opsi 
      : "N/A";
      
    const jawabanUser = jawabanSiswa[String(soal.id)] ?? null;

    return {
      id: soal.id,
      nomor: i + 1,
      subTest: soal.kategori as SubTest,
      pertanyaan: soal.pertanyaan,
      pembahasan: soal.pembahasan,
      pilihan: daftarPilihan, 
      jawabanBenar,
      jawabanUser,
    };
  });

  // ── 5. KALKULASI STATISTIK RINGKAS ──
  let totalBenar = 0;
  let totalSalah = 0;
  let totalKosong = 0;

  for (const s of enrichedSoal) {
    if (s.jawabanUser === null) totalKosong++;
    else if (s.jawabanUser === s.jawabanBenar) totalBenar++;
    else totalSalah++;
  }

  const subtests: SubTest[] = ["TWK", "TIU", "TKP"];

  // ── 6. RENDER KOMPONEN UI ──
  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-10">

      {/* JUDUL HALAMAN */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{TEXT_CONTENT.pageTitle}</h1>
        </div>
        <p className="text-xs text-muted-foreground md:text-sm">
          {TEXT_CONTENT.pageSubtitle} {volumeId} · Analisis Kunci Jawaban Resmi
        </p>
      </div>

      {/* METRIK KARTU STATISTIK SKOR */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: TEXT_CONTENT.labelCorrect, value: totalBenar, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10 dark:border-emerald-500/20" },
          { label: TEXT_CONTENT.labelIncorrect, value: totalSalah, color: "text-destructive", bg: "bg-destructive/5 border-destructive/10 dark:border-destructive/20" },
          { label: TEXT_CONTENT.labelEmpty, value: totalKosong, color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
        ].map((s) => (
          <Card key={s.label} className={`shadow-sm ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-black tracking-tight md:text-3xl ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground md:text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AKORDION DAFTAR SUBTEST */}
      {subtests.map((sub) => {
        const soalSub = enrichedSoal.filter((s) => s.subTest === sub);
        if (soalSub.length === 0) return null;

        return (
          <Card key={sub} className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/30 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className={SUBTEST_CONFIG[sub].badgeClass}>{sub}</Badge>
                <CardTitle className="text-sm font-bold text-foreground">
                  {SUBTEST_CONFIG[sub].label}
                </CardTitle>
                <span className="ml-auto text-xs text-muted-foreground">{soalSub.length} {TEXT_CONTENT.unitQuestions}</span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Accordion type="multiple" className="divide-y divide-border">
                {soalSub.map((soal) => {
                  // PERBAIKAN: Mengubah '$' menjadi 'soal' agar bebas dari error TypeScript
                  const isBenar = soal.jawabanUser === soal.jawabanBenar;
                  const isKosong = soal.jawabanUser === null;

                  return (
                    <AccordionItem key={soal.id} value={String(soal.id)} className="border-none">
                      <AccordionTrigger className="px-5 py-3.5 text-sm hover:bg-muted/40 hover:no-underline data-[state=open]:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 text-left w-full">
                          {isKosong ? (
                            <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          ) : isBenar ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className="font-semibold text-foreground">
                            Soal Nomor {soal.nomor}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-5 pb-6 pt-3 space-y-5">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line select-none">
                          {soal.pertanyaan}
                        </p>

                        {/* DAFTAR PILIHAN JAWABAN */}
                        <div className="space-y-2.5">
                          {soal.pilihan.map((p) => {
                            const isCorrect = p.opsi === soal.jawabanBenar;
                            const isUserChoice = p.opsi === soal.jawabanUser;
                            return (
                              <div key={p.opsi}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border transition-colors
                                  ${isCorrect
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium"
                                    : isUserChoice && !isCorrect
                                    ? "bg-destructive/5 border-destructive/20 text-destructive font-medium"
                                    : "bg-muted/20 border-border text-muted-foreground"
                                  }`}
                              >
                                <span className="font-bold shrink-0">{p.opsi}.</span>
                                <span className="flex-1">{p.teks}</span>
                                
                                {/* Indikator Bobot Poin Opsi */}
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                  p.poin === 5 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                    : p.poin > 0 
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  +{p.poin} Poin
                                </span>

                                {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                {isUserChoice && !isCorrect && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        <Separator className="my-2" />

                        {/* INFORMASI REKAP & KOTAK PEMBAHASAN */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium">
                            <span className="text-muted-foreground">
                              {TEXT_CONTENT.yourAnswerLabel}{" "}
                              <span className={isKosong ? "text-muted-foreground/60" : isBenar ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-destructive font-bold"}>
                                {isKosong ? TEXT_CONTENT.unansweredPlaceholder : soal.jawabanUser}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              {TEXT_CONTENT.correctAnswerLabel}{" "}
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{soal.jawabanBenar}</span>
                            </span>
                          </div>
                          
                          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">
                              {TEXT_CONTENT.explanationHeader}
                            </p>
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                              {soal.pembahasan}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}