/**
 * app/tryout/[id]/pembahasan/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutHistories } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, ChevronRight } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
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
  btnBack: "Kembali ke Hasil",
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

// Schema Zod untuk validasi pilihan dari DB
const PilihanSchema = z.array(z.object({ opsi: z.string(), teks: z.string(), poin: z.number() }));

// Tipe Antarmuka Props Halaman
interface PembahasanPageProps {
  params:      Promise<{ id: string }>;
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
  const { id }        = await params;
  const { historyId } = await searchParams;

  // ── 1. Validasi Otentikasi Sesi ──
  const session = await auth();
  if (!session?.user?.id) redirect(ROUTES.login(id));

  // ── 2. Validasi Parameter ID Volume ──
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  // ── 3. Ambil Data Riwayat Ujian Pengguna ──
  const history = historyId
    ? await db.query.tryoutHistories.findFirst({
        where: and(
          eq(tryoutHistories.id, historyId),
          eq(tryoutHistories.userId, session.user.id)
        ),
      })
    : await db.query.tryoutHistories.findFirst({
        where: and(
          eq(tryoutHistories.userId, session.user.id),
          eq(tryoutHistories.packageId, volumeId)
        ),
      });

  if (!history) notFound();

  const jawabanSiswa = history.jawabanSiswa as Record<string, string>;

  // ── 4. Ambil Daftar Bank Soal Berdasarkan Volume Paket ──
  const soalList = await db
    .select()
    .from(questions)
    .where(eq(questions.packageId, volumeId));

  if (soalList.length === 0) notFound();

  // ── 5. Penggabungan Data Soal dengan Jawaban Pengguna ──
  const enrichedSoal = soalList.map((soal, i) => {
    const daftarPilihan = PilihanSchema.parse(soal.pilihan);
    const jawabanBenar  = daftarPilihan.reduce((a, b) => a.poin >= b.poin ? a : b).opsi;
    const jawabanUser   = jawabanSiswa[String(soal.id)] ?? null;

    return {
      id:          soal.id,
      nomor:       i + 1,
      subTest:     soal.kategori as SubTest,
      pertanyaan:  soal.pertanyaan,
      pembahasan:  soal.pembahasan,
      pilihan:     daftarPilihan.map((p) => ({ opsi: p.opsi, teks: p.teks })),
      jawabanBenar,
      jawabanUser,
    };
  });

  const totalBenar  = enrichedSoal.filter((s) => s.jawabanUser === s.jawabanBenar).length;
  const totalSalah  = enrichedSoal.filter((s) => s.jawabanUser !== null && s.jawabanUser !== s.jawabanBenar).length;
  const totalKosong = enrichedSoal.filter((s) => s.jawabanUser === null).length;
  const subtests: SubTest[] = ["TWK", "TIU", "TKP"];

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* BAR NAVIGASI ATAS */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2 rounded-xl text-muted-foreground hover:text-foreground">
            <Link href={ROUTES.backToResults(id, historyId)}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {TEXT_CONTENT.btnBack}
            </Link>
          </Button>
          <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border">
            Vol. {volumeId} · {enrichedSoal.length} {TEXT_CONTENT.unitQuestions}
          </span>
        </div>

        {/* JUDUL HALAMAN */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{TEXT_CONTENT.pageTitle}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {TEXT_CONTENT.pageSubtitle} {volumeId}
          </p>
        </div>

        {/* METRIK KARTU STATISTIK SKOR */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: TEXT_CONTENT.labelCorrect, value: totalBenar,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10 dark:border-emerald-500/20" },
            { label: TEXT_CONTENT.labelIncorrect, value: totalSalah,  color: "text-destructive",  bg: "bg-destructive/5 border-destructive/10 dark:border-destructive/20" },
            { label: TEXT_CONTENT.labelEmpty, value: totalKosong, color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
          ].map((s) => (
            <Card key={s.label} className={`rounded-2xl border shadow-sm ${s.bg}`}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AKORDION DAFTAR SUBTEST */}
        {subtests.map((sub) => {
          const soalSub = enrichedSoal.filter((s) => s.subTest === sub);
          if (soalSub.length === 0) return null;

          return (
            <Card key={sub} className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-3 px-5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={SUBTEST_CONFIG[sub].badgeClass}>{sub}</Badge>
                  <span className="text-sm font-bold text-foreground">
                    {SUBTEST_CONFIG[sub].label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{soalSub.length} {TEXT_CONTENT.unitQuestions}</span>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Accordion type="multiple" className="divide-y divide-border">
                  {soalSub.map((soal) => {
                    const isBenar  = soal.jawabanUser === soal.jawabanBenar;
                    const isKosong = soal.jawabanUser === null;

                    return (
                      <AccordionItem key={soal.id} value={String(soal.id)} className="border-none">
                        <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/40 data-[state=open]:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 text-left w-full">
                            {isKosong ? (
                              <span className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" aria-label="Tidak dijawab" />
                            ) : isBenar ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-label="Benar" />
                            ) : (
                              <XCircle className="w-5 h-5 text-destructive shrink-0" aria-label="Salah" />
                            )}
                            <span className="text-sm font-medium text-foreground">
                              Soal {soal.nomor}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-5 pb-5 pt-2 space-y-4">
                          <p className="text-sm text-foreground leading-relaxed">
                            {soal.pertanyaan}
                          </p>

                          {/* DAFTAR PILIHAN JAWABAN */}
                          <div className="space-y-2">
                            {soal.pilihan.map((p) => {
                              const isCorrect    = p.opsi === soal.jawabanBenar;
                              const isUserChoice = p.opsi === soal.jawabanUser;
                              return (
                                <div key={p.opsi}
                                  className={`flex items-start gap-3 px-4 py-2.5 rounded-xl text-sm border transition-colors
                                    ${isCorrect
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium"
                                      : isUserChoice && !isCorrect
                                      ? "bg-destructive/5 border-destructive/20 text-destructive font-medium"
                                      : "bg-muted/20 border-border text-muted-foreground"
                                    }`}
                                >
                                  <span className="font-bold shrink-0">{p.opsi}.</span>
                                  <span className="flex-1">{p.teks}</span>
                                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden />}
                                  {isUserChoice && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden />}
                                </div>
                              );
                            })}
                          </div>

                          <Separator />

                          {/* INFORMASI REKAP & KOTAK PEMBAHASAN */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-4 text-xs font-medium">
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
                              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5">
                                {TEXT_CONTENT.explanationHeader}
                              </p>
                              <p className="text-sm text-foreground/90 leading-relaxed">
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

        {/* FOOTER TOMBOL AKSI BAWAH */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button size="lg" className="rounded-xl font-bold gap-2" asChild>
            <Link href={ROUTES.dashboard}>
              {TEXT_CONTENT.btnNextVol}<ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl font-bold" asChild>
            <Link href={ROUTES.backToResults(id, historyId)}>
              {TEXT_CONTENT.btnBack}
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
}