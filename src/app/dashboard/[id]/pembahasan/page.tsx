/**
 * app/dashboard/[id]/pembahasan/page.tsx
 * Async Server Component dinamis untuk menampilkan pembahasan tryout SKD.
 * Dioptimalkan dengan Concurrent Promise.all, Partial Query (hanya kolom spesifik),
 * dan Defensive Parsing untuk performa rendering instan dan keandalan tinggi.
 */

import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutHistories } from "@/db/database/schema";
import { eq, and, desc, asc, SQL } from "drizzle-orm";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, XCircle, BookOpen, MinusCircle } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
} as const;

const ROUTES = {
  login: (id: string) => `/login?callbackUrl=/tryout/${id}/pembahasan`,
  backToResults: (volId: string, historyId?: string) =>
    `/tryout/${volId}/hasil${historyId ? `?historyId=${historyId}` : ""}`,
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

const SUBTEST_CONFIG: Record<SubTest, { label: string; pill: string; header: string }> = {
  TWK: {
    label: "Tes Wawasan Kebangsaan",
    pill: "bg-purple-50 text-primary border-purple-200",
    header: "bg-purple-50 border-purple-200",
  },
  TIU: {
    label: "Tes Inteligensia Umum",
    pill: "bg-purple-50 text-primary border-purple-200",
    header: "bg-purple-50 border-purple-200",
  },
  TKP: {
    label: "Tes Karakteristik Pribadi",
    pill: "bg-purple-50 text-primary border-purple-200",
    header: "bg-purple-50 border-purple-200",
  },
};

const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string().optional(),
    poin: z.number(),
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
  })
);

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
    auth(),
  ]);

  const { id } = resolvedParams;
  const { historyId } = resolvedSearchParams;

  if (!session?.user?.id) redirect(ROUTES.login(id));

  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  // ── 2. MERAKIT KONDISI KUERI RIWAYAT ──
  const queryConditions: SQL[] = [
    eq(tryoutHistories.userId, session.user.id),
    eq(tryoutHistories.packageId, volumeId),
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
        imageUrl: true,
        imageAlt: true,
        pembahasan: true,
        pilihan: true,
      },
    }),
  ]);

  if (!history || soalList.length === 0) notFound();

  const jawabanSiswa = history.jawabanSiswa || {};

  // ── 4. SINKRONISASI DATA SOAL & HASIL UJIAN SISWA ──
  const enrichedSoal = soalList.map((soal, i) => {
    const parsed = PilihanSchema.safeParse(soal.pilihan);
    const daftarPilihan = parsed.success ? parsed.data : [];

    const jawabanBenar =
      daftarPilihan.length > 0
        ? daftarPilihan.reduce((a, b) => (a.poin >= b.poin ? a : b)).opsi
        : "N/A";

    const jawabanUser = jawabanSiswa[String(soal.id)] ?? null;

    return {
      id: soal.id,
      nomor: i + 1,
      subTest: soal.kategori as SubTest,
      pertanyaan: soal.pertanyaan,
      imageUrl: soal.imageUrl,
      imageAlt: soal.imageAlt,
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
  const subtestSections = subtests
    .map((sub) => ({ sub, questions: enrichedSoal.filter((soal) => soal.subTest === sub) }))
    .filter(({ questions }) => questions.length > 0);

  // ── 6. RENDER KOMPONEN UI ──
  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 md:gap-8 md:px-6 md:py-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col gap-1 border-l-4 border-primary pl-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {TEXT_CONTENT.pageTitle}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground md:text-sm">
          {TEXT_CONTENT.pageSubtitle} {volumeId} · Analisis Kunci Jawaban Resmi
        </p>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          {
            label: TEXT_CONTENT.labelCorrect,
            value: totalBenar,
            card: "border-teal-700 bg-teal-700 dark:border-[#2A8065] dark:bg-[#164B3C]",
            iconBg: "bg-teal-600",
            valueColor: "text-white",
            labelColor: "text-white/90",
          },
          {
            label: TEXT_CONTENT.labelIncorrect,
            value: totalSalah,
            card: "border-red-700 bg-red-700 dark:border-[#771A25] dark:bg-[#5E1720]",
            iconBg: "bg-red-600",
            valueColor: "text-white",
            labelColor: "text-white/90",
          },
          {
            label: TEXT_CONTENT.labelEmpty,
            value: totalKosong,
            card: "border-purple-800 bg-purple-800 dark:border-[#1769AA] dark:bg-[#0E4B7F]",
            iconBg: "bg-gray-600",
            valueColor: "text-white",
            labelColor: "text-white/90",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 shadow-sm md:p-5 ${s.card}`}
          >
            <span className={`text-2xl font-bold md:text-3xl ${s.valueColor}`}>
              {s.value}
            </span>
            <span className={`text-xs font-bold ${s.labelColor}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <nav
        aria-label="Navigasi kategori pembahasan"
        className="sticky top-0 z-30 -mx-4 border-y border-purple-100 bg-background/95 px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none"
      >
        <div className="grid grid-cols-3 gap-2">
          {subtestSections.map(({ sub, questions }) => (
            <a
              key={sub}
              href={`#subtest-${sub}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-purple-100 bg-white px-2 text-xs font-bold text-purple-900 transition-colors hover:border-purple-200 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sub}
              <span className="font-medium text-muted-foreground">{questions.length}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ── AKORDION DAFTAR SUBTEST ── */}
      {subtestSections.map(({ sub, questions: soalSub }) => (
          <Card
            key={sub}
            id={`subtest-${sub}`}
            className="scroll-mt-14 gap-0 overflow-hidden border-purple-200 py-0 md:scroll-mt-4"
          >
            {/* Card header — ungu */}
            <CardHeader className={`border-b px-5 py-3.5 ${SUBTEST_CONFIG[sub].header}`}>
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SUBTEST_CONFIG[sub].pill}`}
                >
                  {sub}
                </span>
                <CardTitle className="text-sm font-bold text-purple-900">
                  {SUBTEST_CONFIG[sub].label}
                </CardTitle>
                <span className="ml-auto text-xs text-primary">
                  {soalSub.length} {TEXT_CONTENT.unitQuestions}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Accordion type="multiple" className="divide-y divide-purple-200/40">
                {soalSub.map((soal) => {
                  const isBenar = soal.jawabanUser === soal.jawabanBenar;
                  const isKosong = soal.jawabanUser === null;

                  return (
                    <AccordionItem
                      key={soal.id}
                      value={String(soal.id)}
                      className="border-none"
                    >
                      <AccordionTrigger className="min-h-12 px-4 py-3 text-sm transition-colors hover:bg-purple-50/40 hover:no-underline data-[state=open]:bg-purple-50/30 md:px-5 md:py-3.5">
                        <div className="flex items-center gap-3 text-left w-full">
                          {isKosong ? (
                            <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-label="Belum dijawab" />
                          ) : isBenar ? (
                            <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          <span className="font-semibold text-foreground">
                            Soal Nomor {soal.nomor}
                          </span>
                          {/* Mini status badge di kanan */}
                          <span
                            className={`ml-auto mr-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isKosong
                                ? "bg-gray-50 text-gray-600"
                                : isBenar
                                ? "bg-teal-50 text-teal-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {isKosong
                              ? TEXT_CONTENT.labelEmpty
                              : isBenar
                              ? TEXT_CONTENT.labelCorrect
                              : TEXT_CONTENT.labelIncorrect}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="space-y-4 px-4 pb-5 pt-3 md:space-y-5 md:px-5 md:pb-6 md:pt-4">
                        {/* Teks soal */}
                        <p className="select-none text-sm leading-relaxed text-foreground whitespace-pre-line">
                          {soal.pertanyaan}
                        </p>

                        {soal.imageUrl && (
                          <div className="relative aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white">
                            <Image
                              src={soal.imageUrl}
                              alt={soal.imageAlt || "Gambar soal"}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, 768px"
                              className="object-contain p-3"
                            />
                          </div>
                        )}

                        {/* Daftar pilihan */}
                        <div className="space-y-2">
                          {soal.pilihan.map((p) => {
                            const isCorrect = p.opsi === soal.jawabanBenar;
                            const isUserChoice = p.opsi === soal.jawabanUser;

                            return (
                              <div
                                key={p.opsi}
                                className={`flex min-h-11 items-start gap-2.5 rounded-xl border px-3 py-3 text-sm transition-colors md:items-center md:gap-3 md:px-4 ${
                                  isCorrect
                                    ? "border-teal-200 bg-teal-50 font-medium text-teal-900"
                                    : isUserChoice && !isCorrect
                                    ? "border-red-200 bg-red-50 font-medium text-red-900"
                                    : "border-purple-200/40 bg-purple-50/20 text-muted-foreground"
                                }`}
                              >
                                <span className="shrink-0 font-bold">{p.opsi}.</span>
                                <span className="flex-1">{p.teks}</span>
                                {p.imageUrl && (
                                  <span className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-md border border-border bg-white">
                                    <Image
                                      src={p.imageUrl}
                                      alt={p.imageAlt || `Gambar pilihan ${p.opsi}`}
                                      fill
                                      unoptimized
                                      sizes="96px"
                                      className="object-contain p-1"
                                    />
                                  </span>
                                )}

                                {/* Bobot poin */}
                                <span
                                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    p.poin === 5
                                      ? "bg-teal-50 text-teal-600"
                                      : p.poin > 0
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-gray-50 text-gray-600"
                                  }`}
                                >
                                  +{p.poin}
                                </span>

                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                                )}
                                {isUserChoice && !isCorrect && (
                                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <Separator className="bg-purple-200/40" />

                        {/* Rekap jawaban & kotak pembahasan */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium">
                            <span className="text-muted-foreground">
                              {TEXT_CONTENT.yourAnswerLabel}{" "}
                              <span
                                className={
                                  isKosong
                                    ? "text-muted-foreground/60"
                                    : isBenar
                                    ? "font-bold text-teal-600"
                                    : "font-bold text-red-600"
                                }
                              >
                                {isKosong
                                  ? TEXT_CONTENT.unansweredPlaceholder
                                  : soal.jawabanUser}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              {TEXT_CONTENT.correctAnswerLabel}{" "}
                              <span className="font-bold text-teal-600">
                                {soal.jawabanBenar}
                              </span>
                            </span>
                          </div>

                          {/* Kotak pembahasan — warna ungu konsisten */}
                          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                              {TEXT_CONTENT.explanationHeader}
                            </p>
                            <p className="text-sm leading-relaxed text-purple-900 whitespace-pre-line">
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
      ))}
    </div>
  );
}
