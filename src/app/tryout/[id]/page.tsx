"use client";

/**
 * app/tryout/[id]/page.tsx
 * ✅ Fetch soal dari /api/soal?volumeId=[id]
 * ✅ Submit jawaban ke /api/submit lalu redirect ke halaman hasil
 * ✅ React Compiler aktif — hapus useCallback manual
 * ✅ params dibaca via useParams (Client Component)
 * ✅ Timer countdown + auto-submit saat habis
 */

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  LayoutGrid,
  BookOpen,
  Loader2,
} from "lucide-react";

// ── TYPES ──────────────────────────────────────────────────────────────────

type SubTest = "TWK" | "TIU" | "TKP";
type AnswerStatus = "answered" | "flagged" | "unanswered";

interface Question {
  id: number;
  kategori: SubTest;
  pertanyaan: string;
  pilihan: { opsi: string; teks: string }[];
}

interface UserAnswer {
  selectedKey: string | null;
  status: AnswerStatus;
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const DURATION_SECONDS = 100 * 60; // 100 menit

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── KOMPONEN UTAMA ─────────────────────────────────────────────────────────

export default function TryoutPage() {
  const params = useParams();
  const router = useRouter();
  const volumeId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});
  const [timeLeft, setTimeLeft] = useState<number>(DURATION_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── FETCH SOAL ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchSoal() {
      try {
        const res = await fetch(`/api/soal?volumeId=${volumeId}`);
        const data = await res.json();

        if (!res.ok) {
          setFetchError(data.error ?? "Gagal memuat soal.");
          return;
        }

        setQuestions(data.data);
        setActiveId(data.data[0]?.id ?? 1);

        // ✅ Inisialisasi semua jawaban dengan status unanswered
        setAnswers(
          Object.fromEntries(
            data.data.map((q: Question) => [
              q.id,
              { selectedKey: null, status: "unanswered" as AnswerStatus },
            ])
          )
        );
      } catch {
        setFetchError("Terjadi kesalahan jaringan. Periksa koneksi kamu.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSoal();
  }, [volumeId]);

  // ── TIMER ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit(); // ✅ Auto-submit saat waktu habis
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading, timeLeft]);

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Format jawaban: { "soalId": "opsi" }
    const answersFormatted = Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => v.selectedKey !== null)
        .map(([k, v]) => [k, v.selectedKey!])
    );

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: volumeId, answers: answersFormatted }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        return;
      }

      // ✅ Redirect ke halaman hasil
      router.push(`/tryout/${volumeId}/hasil?historyId=${data.historyId}`);
    } catch {
      setIsSubmitting(false);
    }
  }

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  // ✅ React Compiler aktif — tidak perlu useCallback manual

  function handleAnswer(key: string) {
    setAnswers((prev) => ({
      ...prev,
      [activeId]: { selectedKey: key, status: "answered" },
    }));
  }

  function handleFlag() {
    setAnswers((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        status: prev[activeId]?.status === "flagged" ? "answered" : "flagged",
      },
    }));
  }

  // ── DERIVED STATE ─────────────────────────────────────────────────────────

  const currentQuestion = questions.find((q) => q.id === activeId);
  const currentAnswer = answers[activeId];
  const answeredCount = Object.values(answers).filter((a) => a.status === "answered").length;
  const flaggedCount = Object.values(answers).filter((a) => a.status === "flagged").length;
  const unansweredCount = questions.length - answeredCount - flaggedCount;
  const progressPercent = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;
  const isWarning = timeLeft < 10 * 60;

  function getNavButtonVariant(id: number) {
    if (id === activeId) return "active";
    const s = answers[id]?.status;
    if (s === "answered") return "answered";
    if (s === "flagged") return "flagged";
    return "outline";
  }

  // ── LOADING STATE ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="font-semibold text-slate-800 dark:text-slate-100">{fetchError}</p>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="bg-slate-50 dark:bg-slate-900 font-sans antialiased text-slate-800 dark:text-slate-100 min-h-screen">

        {/* HEADER */}
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm">CAT</div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold leading-tight">Ujian Seleksi Kompetensi Dasar</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SKD CPNS 2026 · Vol. {volumeId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm
                  ${isWarning
                    ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
                    : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  }`}
              >
                <Clock className="w-4 h-4" aria-hidden />
                <span aria-live="polite" aria-atomic="true">{formatTime(timeLeft)}</span>
              </div>

              <Avatar className="h-9 w-9">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" alt="Foto profil" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* PANEL SOAL */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Progress Pengerjaan</span>
                <span>{answeredCount} dari {questions.length} soal terjawab ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-3 px-5 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" aria-hidden />
                  <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                    Soal Nomor {activeId}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                  {currentQuestion?.kategori}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 md:p-8 space-y-6">
                <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
                  {currentQuestion?.pertanyaan}
                </p>

                <RadioGroup
                  value={currentAnswer?.selectedKey ?? ""}
                  onValueChange={handleAnswer}
                  className="space-y-2.5"
                >
                  {currentQuestion?.pilihan.map((opt) => {
                    const isSelected = currentAnswer?.selectedKey === opt.opsi;
                    return (
                      <Label
                        key={opt.opsi}
                        htmlFor={`opt-${opt.opsi}`}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                          ${isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400"
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
                          }`}
                      >
                        <RadioGroupItem value={opt.opsi} id={`opt-${opt.opsi}`} />
                        <span className={`text-sm ${isSelected ? "text-blue-800 dark:text-blue-200 font-semibold" : "text-slate-700 dark:text-slate-200"}`}>
                          {opt.opsi}. {opt.teks}
                        </span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex flex-wrap gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    const idx = questions.findIndex((q) => q.id === activeId);
                    if (idx > 0) setActiveId(questions[idx - 1].id);
                  }}
                  disabled={questions.findIndex((q) => q.id === activeId) === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />
                  Sebelumnya
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentAnswer?.status === "flagged" ? "default" : "outline"}
                      className={currentAnswer?.status === "flagged"
                        ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white"
                        : "border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
                      }
                      onClick={handleFlag}
                    >
                      <AlertCircle className="w-4 h-4 mr-1.5" aria-hidden />
                      {currentAnswer?.status === "flagged" ? "Batalkan Ragu" : "Ragu-Ragu"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tandai soal ini untuk ditinjau kembali</p>
                  </TooltipContent>
                </Tooltip>

                <Button
                  onClick={() => {
                    const idx = questions.findIndex((q) => q.id === activeId);
                    if (idx < questions.length - 1) setActiveId(questions[idx + 1].id);
                  }}
                  disabled={questions.findIndex((q) => q.id === activeId) === questions.length - 1}
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* PANEL NAVIGASI */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center gap-2 space-y-0">
                <LayoutGrid className="w-4 h-4 text-blue-600" aria-hidden />
                <h2 className="font-bold text-sm text-slate-700 dark:text-slate-200">Navigasi Soal</h2>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{answeredCount}</span>
                    <span className="text-blue-600 dark:text-blue-400">Terjawab</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-amber-700 dark:text-amber-300">{flaggedCount}</span>
                    <span className="text-amber-600 dark:text-amber-400">Ragu-Ragu</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600" />
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{unansweredCount}</span>
                    <span className="text-slate-500 dark:text-slate-400">Belum</span>
                  </div>
                </div>

                <ScrollArea className="h-80">
                  <div className="grid grid-cols-5 gap-1.5 pr-3">
                    {questions.map((q) => {
                      const v = getNavButtonVariant(q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => setActiveId(q.id)}
                          aria-label={`Soal ${q.id}`}
                          aria-current={q.id === activeId ? "true" : undefined}
                          className={`h-9 w-full rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                            ${v === "active"
                              ? "bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-900"
                              : v === "answered"
                              ? "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
                              : v === "flagged"
                              ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700"
                              : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            }`}
                        >
                          {q.id}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" aria-hidden />
                          Selesai Ujian
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Yakin ingin mengakhiri ujian?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Kamu baru menjawab <strong>{answeredCount} dari {questions.length} soal</strong>.
                        {unansweredCount > 0 && ` Masih ada ${unansweredCount} soal yang belum dijawab.`}
                        {" "}Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Kembali ke Ujian</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSubmit}
                      >
                        Ya, Selesaikan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="bg-blue-900 dark:bg-blue-950 border-blue-800 text-blue-100 shadow-sm">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">Tips Ujian</p>
                <p className="text-sm leading-relaxed italic opacity-90">
                  Kerjakan soal yang paling mudah terlebih dahulu. Gunakan fitur Ragu-Ragu untuk menandai soal yang ingin ditinjau ulang.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}