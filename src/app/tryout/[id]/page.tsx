"use client";

/**
 * app/tryout/[id]/page.tsx
 */

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  Clock, LayoutGrid, BookOpen, Loader2,
} from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const TIMER_CONFIG = {
  durationSeconds: 100 * 60,
  warningThresholdSeconds: 10 * 60,
} as const;

const API_ROUTES = {
  getQuestions: (volId: string) => `/api/soal?volumeId=${volId}`,
  submitExam: "/api/submit",
  redirectToResults: (volId: string, historyId: string) => `/tryout/${volId}/hasil?historyId=${historyId}`,
  redirectToLogin: (volId: string) => `/login?callbackUrl=/tryout/${volId}`,
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  headerBadge: "CAT",
  headerTitle: "Ujian Seleksi Kompetensi Dasar",
  headerSubtitle: "SKD CPNS 2026 · Vol.",
  progressLabel: "Progress Pengerjaan",
  questionNumberLabel: "Soal Nomor",
  actionPrev: "Sebelumnya",
  actionNext: "Selanjutnya",
  actionFlag: "Ragu-Ragu",
  actionUnflag: "Batalkan Ragu",
  flagTooltip: "Tandai soal ini untuk ditinjau kembali",
  sidebarTitle: "Navigasi Soal",
  statusAnswered: "Terjawab",
  statusFlagged: "Ragu-Ragu",
  statusUnanswered: "Belum",
  btnSubmit: "Selesai Ujian",
  btnSubmitting: "Mengirim...",
  alertTitle: "Yakin ingin mengakhiri ujian?",
  alertCancel: "Kembali ke Ujian",
  alertConfirm: "Ya, Selesaikan",
  tipsTitle: "Tips Ujian",
  tipsDesc: "Kerjakan soal yang paling mudah terlebih dahulu. Gunakan fitur Ragu-Ragu untuk menandai soal yang ingin ditinjau ulang.",
  errorFallback: "Gagal memuat soal.",
  networkError: "Terjadi kesalahan jaringan. Periksa koneksi kamu.",
} as const;

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function TryoutPage() {
  const params   = useParams();
  const router   = useRouter();
  const volumeId = params.id as string;

  const { data: session, status: sessionStatus } = useSession();

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeId, setActiveId]     = useState<number>(1);
  const [answers, setAnswers]       = useState<Record<number, UserAnswer>>({});
  const [timeLeft, setTimeLeft]     = useState<number>(TIMER_CONFIG.durationSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proteksi rute client-side jika status tidak otentikasi
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(API_ROUTES.redirectToLogin(volumeId));
    }
  }, [sessionStatus, router, volumeId]);

  // ── FETCH DATA BANK SOAL ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    async function fetchSoal() {
      try {
        const res  = await fetch(API_ROUTES.getQuestions(volumeId));
        const data = await res.json();

        if (!res.ok) {
          setFetchError(data.error ?? TEXT_CONTENT.errorFallback);
          return;
        }

        setQuestions(data.data);
        setActiveId(data.data[0]?.id ?? 1);
        setAnswers(
          Object.fromEntries(
            data.data.map((q: Question) => [
              q.id,
              { selectedKey: null, status: "unanswered" as AnswerStatus },
            ])
          )
        );
      } catch {
        setFetchError(TEXT_CONTENT.networkError);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSoal();
  }, [volumeId, sessionStatus]);

  // ── TIMER ENGINE ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, timeLeft]);

  // ── AKSI SUBMIT JAWABAN ────────────────────────────────────────────────────
  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const answersFormatted = Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => v.selectedKey !== null)
        .map(([k, v]) => [k, v.selectedKey!])
    );

    try {
      const res  = await fetch(API_ROUTES.submitExam, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: volumeId, answers: answersFormatted }),
      });
      const data = await res.json();

      if (!res.ok) return;

      router.push(API_ROUTES.redirectToResults(volumeId, data.historyId));
    } catch {
      // Catch error ditangani secara aman oleh block finally
    } finally {
      setIsSubmitting(false);
    }
  }

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

  // ── DERIVED STATES ────────────────────────────────────────────────────────
  const currentQuestion  = questions.find((q) => q.id === activeId);
  const currentAnswer    = answers[activeId];
  const answeredCount    = Object.values(answers).filter((a) => a.status === "answered").length;
  const flaggedCount     = Object.values(answers).filter((a) => a.status === "flagged").length;
  const unansweredCount  = questions.length - answeredCount - flaggedCount;
  const progressPercent  = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isWarning        = timeLeft < TIMER_CONFIG.warningThresholdSeconds;
  const currentIdx       = questions.findIndex((q) => q.id === activeId);

  const userName     = session?.user?.name ?? "Peserta";
  const userImage    = session?.user?.image ?? undefined;
  const userInitials = userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // Pengaturan gaya tombol navigasi berbasis variabel token
  function getNavStyle(id: number) {
    if (id === activeId) return "bg-primary text-primary-foreground ring-2 ring-primary/20";
    const s = answers[id]?.status;
    if (s === "answered") return "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20";
    if (s === "flagged") return "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 hover:bg-amber-500/20";
    return "bg-card text-muted-foreground border border-border hover:border-primary/50 hover:text-primary";
  }

  // ── STATE LOADING / SKELETON ──
  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-4 max-w-7xl mx-auto">
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

  // ── STATE ERROR HANDLING ──
  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-destructive/20 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="font-semibold text-foreground">{fetchError}</p>
            <Button onClick={() => router.push(API_ROUTES.dashboard)} variant="outline">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-background font-sans antialiased text-foreground min-h-screen">

        {/* AREA HEADER BAR */}
        <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-sm">
                {TEXT_CONTENT.headerBadge}
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold leading-tight">{TEXT_CONTENT.headerTitle}</h1>
                <p className="text-xs text-muted-foreground">{TEXT_CONTENT.headerSubtitle} {volumeId}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm
                ${isWarning
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-muted border-border text-muted-foreground"
                }`}
              >
                <Clock className="w-4 h-4" aria-hidden />
                <span aria-live="polite" aria-atomic="true">{formatTime(timeLeft)}</span>
              </div>

              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={userImage} alt={`Foto profil ${userName}`} />
                <AvatarFallback className="text-xs font-bold">{userInitials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* SEKSI UTAMA PLATFORM */}
        <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* AREA KIRI: BARIS KONTEN PERTANYAAN */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{TEXT_CONTENT.progressLabel}</span>
                <span>{answeredCount} dari {questions.length} soal terjawab ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>

            <Card className="shadow-sm bg-card border-border">
              <CardHeader className="bg-muted/30 border-b border-border py-3 px-5 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" aria-hidden />
                  <span className="font-bold text-primary text-sm">
                    {TEXT_CONTENT.questionNumberLabel} {activeId}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                  {currentQuestion?.kategori}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 md:p-8 space-y-6">
                <p className="text-base leading-relaxed text-foreground">
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
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-border hover:bg-muted/50 hover:border-border/80"
                          }`}
                      >
                        <RadioGroupItem value={opt.opsi} id={`opt-${opt.opsi}`} />
                        <span className={`text-sm ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                          {opt.opsi}. {opt.teks}
                        </span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </CardContent>

              <CardFooter className="bg-muted/20 border-t border-border px-5 py-3 flex flex-wrap gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => { if (currentIdx > 0) setActiveId(questions[currentIdx - 1].id); }}
                  disabled={currentIdx === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />{TEXT_CONTENT.actionPrev}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentAnswer?.status === "flagged" ? "default" : "outline"}
                      className={currentAnswer?.status === "flagged"
                        ? "bg-amber-500 hover:bg-amber-600 border-amber-500 text-white"
                        : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-400"
                      }
                      onClick={handleFlag}
                    >
                      <AlertCircle className="w-4 h-4 mr-1.5" aria-hidden />
                      {currentAnswer?.status === "flagged" ? TEXT_CONTENT.actionUnflag : TEXT_CONTENT.actionFlag}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{TEXT_CONTENT.flagTooltip}</p></TooltipContent>
                </Tooltip>

                <Button
                  onClick={() => { if (currentIdx < questions.length - 1) setActiveId(questions[currentIdx + 1].id); }}
                  disabled={currentIdx === questions.length - 1}
                >
                  {TEXT_CONTENT.actionNext}<ChevronRight className="w-4 h-4 ml-1" aria-hidden />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* AREA KANAN: PANEL NAVIGASI ANGKA NOMOR */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-sm bg-card border-border">
              <CardHeader className="py-3 px-5 border-b border-border flex-row items-center gap-2 space-y-0">
                <LayoutGrid className="w-4 h-4 text-primary" aria-hidden />
                <h2 className="font-bold text-sm text-foreground">{TEXT_CONTENT.sidebarTitle}</h2>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/5 border border-primary/10">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">{answeredCount}</span>
                    <span className="text-muted-foreground">{TEXT_CONTENT.statusAnswered}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{flaggedCount}</span>
                    <span className="text-muted-foreground">{TEXT_CONTENT.statusFlagged}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted border border-border">
                    <span className="w-4 h-4 rounded border-2 border-muted-foreground/30" />
                    <span className="font-semibold text-foreground">{unansweredCount}</span>
                    <span className="text-muted-foreground">{TEXT_CONTENT.statusUnanswered}</span>
                  </div>
                </div>

                <ScrollArea className="h-80">
                  <div className="grid grid-cols-5 gap-1.5 pr-3">
                    {questions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => setActiveId(q.id)}
                        aria-label={`Soal ${q.id}`}
                        aria-current={q.id === activeId ? "true" : undefined}
                        className={`h-9 w-full rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getNavStyle(q.id)}`}
                      >
                        {q.id}
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />{TEXT_CONTENT.btnSubmitting}</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" aria-hidden />{TEXT_CONTENT.btnSubmit}</>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{TEXT_CONTENT.alertTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Kamu baru menjawab <strong>{answeredCount} dari {questions.length} soal</strong>.
                        {unansweredCount > 0 && ` Masih ada ${unansweredCount} soal yang belum dijawab.`}
                        {" "}Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{TEXT_CONTENT.alertCancel}</AlertDialogCancel>
                      <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit}>
                        {TEXT_CONTENT.alertConfirm}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* BOX TIPS TRICK BANNER */}
            <Card className="bg-primary text-primary-foreground shadow-sm border-0">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">{TEXT_CONTENT.tipsTitle}</p>
                <p className="text-sm leading-relaxed italic opacity-90">
                  {TEXT_CONTENT.tipsDesc}
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}