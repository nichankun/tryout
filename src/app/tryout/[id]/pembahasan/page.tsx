/**
 * app/tryout/[id]/pembahasan/page.tsx
 *
 * 📦 INSTALL:
 *   npx shadcn@latest add accordion badge card separator
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  ChevronRight,
} from "lucide-react";

interface PembahasanPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PembahasanPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pembahasan Tryout SKD Vol. ${id} — ASNPedia`,
    description: "Pembahasan lengkap soal dan jawaban tryout SKD CPNS.",
  };
}

// ── Tipe ──
type SubTest = "TWK" | "TIU" | "TKP";

interface Pilihan {
  opsi: string;
  teks: string;
}

interface SoalPembahasan {
  id: number;
  nomor: number;
  subTest: SubTest;
  kategori: string;
  pertanyaan: string;
  pilihan: Pilihan[];
  jawabanBenar: string;
  jawabanUser: string | null;
  pembahasan: string;
}

// ── Warna per subtest ──
const SUBTEST_COLOR: Record<SubTest, string> = {
  TWK: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  TIU: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  TKP: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// ── Mock data — di production: fetch dari DB berdasarkan volumeId & userId ──
function getMockPembahasan(volumeId: number): SoalPembahasan[] {
  return Array.from({ length: 10 }, (_, i) => {
    const nomor = i + 1;
    const subTest: SubTest = nomor <= 3 ? "TWK" : nomor <= 7 ? "TIU" : "TKP";
    const jawabanBenar = ["A", "B", "C", "D", "E"][i % 5];
    const jawabanUser = i % 3 === 0 ? null : ["A", "B", "C", "D", "E"][(i + 1) % 5];
    return {
      id: nomor,
      nomor,
      subTest,
      kategori: subTest === "TWK" ? "Nasionalisme" : subTest === "TIU" ? "Analitis" : "Pelayanan Publik",
      pertanyaan: `Ini adalah contoh soal nomor ${nomor} untuk subtest ${subTest} pada Tryout Vol. ${volumeId}. Bacalah dengan seksama.`,
      pilihan: ["A", "B", "C", "D", "E"].map((opsi) => ({
        opsi,
        teks: `Pilihan jawaban ${opsi} untuk soal nomor ${nomor}`,
      })),
      jawabanBenar,
      jawabanUser,
      pembahasan: `Jawaban yang benar adalah ${jawabanBenar}. Penjelasan lengkap mengenai mengapa jawaban ini tepat berdasarkan materi ${subTest} dan konteks soal yang diberikan. Ini adalah pembahasan mock untuk keperluan development.`,
    };
  });
}

export default async function PembahasanPage({ params }: PembahasanPageProps) {
  const { id } = await params;

  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > 20) notFound();

  // Production: const pembahasan = await getPembahasanTryout(volumeId, userId);
  // if (!pembahasan) notFound();
  const soalList = getMockPembahasan(volumeId);

  const totalBenar = soalList.filter(
    (s) => s.jawabanUser === s.jawabanBenar
  ).length;
  const totalSalah = soalList.filter(
    (s) => s.jawabanUser !== null && s.jawabanUser !== s.jawabanBenar
  ).length;
  const totalKosong = soalList.filter((s) => s.jawabanUser === null).length;

  const subtests: SubTest[] = ["TWK", "TIU", "TKP"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2 rounded-xl">
            <Link href={`/tryout/${volumeId}/hasil`}>
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Kembali ke Hasil
            </Link>
          </Button>
          <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full">
            Vol. {volumeId} · {soalList.length} Soal
          </span>
        </div>

        {/* Judul */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" aria-hidden />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Pembahasan Soal
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tryout SKD CPNS — Volume {volumeId}
          </p>
        </div>

        {/* Statistik ringkas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Benar", value: totalBenar, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900" },
            { label: "Salah", value: totalSalah, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900" },
            { label: "Kosong", value: totalKosong, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" },
          ].map((s) => (
            <Card key={s.label} className={`rounded-2xl border shadow-sm ${s.bg}`}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pembahasan per subtest */}
        {subtests.map((sub) => {
          const soalSub = soalList.filter((s) => s.subTest === sub);
          if (soalSub.length === 0) return null;

          return (
            <Card key={sub} className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-3 px-5">
                <div className="flex items-center gap-2">
                  <Badge className={SUBTEST_COLOR[sub]}>{sub}</Badge>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {sub === "TWK" ? "Tes Wawasan Kebangsaan" : sub === "TIU" ? "Tes Inteligensia Umum" : "Tes Karakteristik Pribadi"}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">{soalSub.length} soal</span>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Accordion type="multiple" className="divide-y divide-slate-100 dark:divide-slate-800">
                  {soalSub.map((soal) => {
                    const isBenar = soal.jawabanUser === soal.jawabanBenar;
                    const isKosong = soal.jawabanUser === null;

                    return (
                      <AccordionItem
                        key={soal.id}
                        value={String(soal.id)}
                        className="border-none"
                      >
                        <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-800/50 data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-800/50">
                          <div className="flex items-center gap-3 text-left w-full">
                            {isKosong ? (
                              <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" aria-label="Tidak dijawab" />
                            ) : isBenar ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" aria-label="Benar" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 shrink-0" aria-label="Salah" />
                            )}
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              Soal {soal.nomor}
                            </span>
                            <Badge variant="outline" className="text-xs ml-auto mr-2 hidden sm:inline-flex">
                              {soal.kategori}
                            </Badge>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-5 pb-5 pt-2 space-y-4">
                          {/* Pertanyaan */}
                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            {soal.pertanyaan}
                          </p>

                          {/* Pilihan jawaban */}
                          <div className="space-y-2">
                            {soal.pilihan.map((p) => {
                              const isCorrect = p.opsi === soal.jawabanBenar;
                              const isUserChoice = p.opsi === soal.jawabanUser;

                              return (
                                <div
                                  key={p.opsi}
                                  className={`flex items-start gap-3 px-4 py-2.5 rounded-xl text-sm border transition-colors
                                    ${isCorrect
                                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                                      : isUserChoice && !isCorrect
                                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                                      : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                                >
                                  <span className="font-bold shrink-0">{p.opsi}.</span>
                                  <span className="flex-1">{p.teks}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden />
                                  )}
                                  {isUserChoice && !isCorrect && (
                                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <Separator />

                          {/* Jawaban & Pembahasan */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-4 text-xs font-medium">
                              <span className="text-slate-500 dark:text-slate-400">
                                Jawaban kamu:{" "}
                                <span className={isKosong ? "text-slate-400" : isBenar ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>
                                  {isKosong ? "Tidak dijawab" : soal.jawabanUser}
                                </span>
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                Jawaban benar:{" "}
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {soal.jawabanBenar}
                                </span>
                              </span>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
                              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5">
                                Pembahasan
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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

        {/* CTA bawah */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button size="lg" className="rounded-xl font-bold gap-2" asChild>
            <Link href="/dashboard">
              Coba Volume Lain
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl font-bold" asChild>
            <Link href={`/tryout/${volumeId}/hasil`}>
              Kembali ke Hasil
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
}