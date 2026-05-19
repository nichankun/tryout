"use client";

/**
 * app/tryout/[id]/tryout-client.tsx
 * * Client Component Simulator CAT Premium (100% Strict Type Safe & Ultra Optimized).
 * Dilengkapi dengan fitur Auto-Pause (Anti Tab-Switch / Offline) dan Restart.
 */

import * as React from "react";
import { useTransition, useCallback, useMemo, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock, LayoutGrid, BookOpen, Loader2, RotateCcw, WifiOff } from "lucide-react";
import { submitTryoutAction } from "../../../lib/actions/tryout";

// ==========================================
// KONSTANTA & CONFIGURATION DICTIONARY
// ==========================================
const TIMER_CONFIG = {
  durationSeconds: 100 * 60,
  warningThresholdSeconds: 10 * 60,
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
} as const;

type SubTest = "TWK" | "TIU" | "TKP";
type AnswerStatus = "answered" | "flagged" | "unanswered";

interface Question {
  id: number;
  kategori: SubTest;
  pertanyaan: string;
  pilihan: { opsi: string; teks: string; poin?: number }[];
}

interface UserAnswer {
  selectedKey: string | null;
  status: AnswerStatus;
}

interface TryoutClientProps {
  volumeId: number;
  packageTitle: string;
  questions: Question[];
  userName: string;
  userImage?: string;
}

// ==========================================
// OPTIMASI: ISOLATED TIMER COMPONENT (Auto-Pause Ready)
// ==========================================
const ExamTimer = React.memo(({ 
  initialTimeLeft, 
  isPaused, 
  onExpire,
  timeLeftRef 
}: { 
  initialTimeLeft: number;
  isPaused: boolean;
  onExpire: () => void;
  timeLeftRef: React.MutableRefObject<number>;
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    // Sinkronkan ref setiap kali UI timer re-render, agar parent bisa menyimpannya ke LocalStorage
    timeLeftRef.current = timeLeft;

    // Jika sedang di-pause, interval dimatikan total.
    if (isPaused) return;

    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    // Kalkulasi target (memastikan timer tidak lambat/drift dari setInterval)
    // Ketika di-resume, targetTime di-generate ulang dari sisa waktu (timeLeft) yang beku.
    const targetTime = Date.now() + (timeLeft * 1000);

    const interval = setInterval(() => {
      const newTimeLeft = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(newTimeLeft);
      timeLeftRef.current = newTimeLeft;

      if (newTimeLeft <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onExpire, timeLeftRef]); // Effect hanya berulang ketika status pause diubah

  const isWarning = timeLeft < TIMER_CONFIG.warningThresholdSeconds;
  const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const s = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm transition-colors
      ${isWarning ? "bg-destructive/10 border-destructive/20 text-destructive animate-pulse" : "bg-muted border-border text-muted-foreground"}`}
    >
      <Clock className="w-4 h-4" />
      <span>{m}:{s}</span>
    </div>
  );
});
ExamTimer.displayName = "ExamTimer";

// ==========================================
// RUNTIME DESCRIPTOR ENGINE Component
// ==========================================
export default function TryoutClient({
  volumeId,
  packageTitle,
  questions,
  userName,
  userImage,
}: TryoutClientProps) {
  const [activeId, setActiveId] = useState<number>(questions[0]?.id ?? 1);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});
  
  // State manajemen timer
  const [initialTime, setInitialTime] = useState<number | null>(null);
  const [timerKey, setTimerKey] = useState<number>(0); // Untuk me-remount timer saat Restart
  const timeLeftRef = useRef<number>(TIMER_CONFIG.durationSeconds); // Referensi non-render untuk LocalStorage

  // Auto-pause states
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<"offline" | "hidden" | null>(null);

  // React 18+ Transition untuk mencegah UI freeze saat memanggil Server Action
  const [isPending, startTransition] = useTransition();

  const STORAGE_KEY = `cat_exam_session_vol_${volumeId}`;
  const userInitials = userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  // ── 1. SINKRONISASI LOG STATE (LOCAL STORAGE) ──
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setAnswers(parsed.answers || {});
        
        // Membaca sisa waktu terakhir
        if (typeof parsed.timeLeft === "number" && parsed.timeLeft > 0) {
          setInitialTime(parsed.timeLeft);
          timeLeftRef.current = parsed.timeLeft;
        } else {
          setInitialTime(TIMER_CONFIG.durationSeconds);
        }
      } catch {
        console.error("Gagal memuat restorasi backup log sesi ujian.");
        setInitialTime(TIMER_CONFIG.durationSeconds);
      }
    } else {
      // Inisialisasi awal
      setAnswers(
        Object.fromEntries(
          questions.map((q) => [q.id, { selectedKey: null, status: "unanswered" as AnswerStatus }])
        )
      );
      setInitialTime(TIMER_CONFIG.durationSeconds);
    }
  }, [STORAGE_KEY, questions]);

  // Fungsi simpan state persisten (hanya dipanggil saat jawaban berubah / di-pause)
  const saveSessionState = useCallback(() => {
    if (Object.keys(answers).length === 0 || initialTime === null) return;
    const sessionPayload = { answers, timeLeft: timeLeftRef.current };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
  }, [answers, initialTime, STORAGE_KEY]);

  useEffect(() => {
    saveSessionState();
  }, [answers, isPaused, saveSessionState]);


  // ── 2. SENSOR AUTO-PAUSE (OFFLINE & TAB VISIBILITY) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
        setPauseReason("hidden");
      } else {
        // Jika tab aktif kembali, periksa koneksi terlebih dulu
        if (navigator.onLine) {
          setIsPaused(false);
          setPauseReason(null);
        } else {
          setPauseReason("offline"); // Override ke mode offline jika internet mati
        }
      }
    };

    const handleOffline = () => {
      setIsPaused(true);
      setPauseReason("offline");
    };

    const handleOnline = () => {
      if (!document.hidden) {
        setIsPaused(false);
        setPauseReason(null);
      } else {
        setPauseReason("hidden");
      }
    };

    if (typeof window !== "undefined") {
      if (!navigator.onLine) handleOffline();
      if (document.hidden) handleVisibility();

      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("online", handleOnline);
      };
    }
  }, []);


  // ── 3. USER INTERACTION METHODS ──
  const handleAnswer = useCallback((key: string) => {
    setAnswers((prev) => ({
      ...prev,
      [activeId]: {
        selectedKey: key,
        status: prev[activeId]?.status === "flagged" ? "flagged" : "answered",
      },
    }));
  }, [activeId]);

  const handleFlag = useCallback(() => {
    setAnswers((prev) => {
      const current = prev[activeId];
      return {
        ...prev,
        [activeId]: {
          ...current,
          status: current?.status === "flagged" 
            ? (current?.selectedKey ? "answered" : "unanswered") 
            : "flagged",
        },
      };
    });
  }, [activeId]);

  const handleSubmitUjian = useCallback(() => {
    if (isPending) return;
    
    startTransition(async () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        await submitTryoutAction({ volumeId, answers });
      } catch (error) {
        console.error("Gagal memproses pengiriman data lembar ujian:", error);
      }
    });
  }, [isPending, volumeId, answers, STORAGE_KEY]);

  const handleAutoSubmit = useCallback(() => {
    // Diganti dengan pengiriman otomatis
    handleSubmitUjian();
  }, [handleSubmitUjian]);

  const handleRestart = useCallback(() => {
    if (isPending) return;
    
    // Reset seluruh state
    const emptyAnswers = Object.fromEntries(
      questions.map((q) => [q.id, { selectedKey: null, status: "unanswered" as AnswerStatus }])
    );
    
    setAnswers(emptyAnswers);
    setActiveId(questions[0]?.id ?? 1);
    
    // Reset Timer & Storage
    setInitialTime(TIMER_CONFIG.durationSeconds);
    timeLeftRef.current = TIMER_CONFIG.durationSeconds;
    setTimerKey(prev => prev + 1); // Me-remount komponen Timer
    localStorage.removeItem(STORAGE_KEY);
    setIsPaused(false);
  }, [isPending, questions, STORAGE_KEY]);


  // ── 4. DERIVED METRICS ──
  const { currentQuestion, currentIdx } = useMemo(() => {
    const idx = questions.findIndex((q) => q.id === activeId);
    return { currentQuestion: questions[idx] || questions[0], currentIdx: idx !== -1 ? idx : 0 };
  }, [activeId, questions]);

  const { answeredCount, flaggedCount, unansweredCount, progressPercent } = useMemo(() => {
    const vals = Object.values(answers);
    const ansCount = vals.filter((a) => a.status === "answered").length;
    const flgCount = vals.filter((a) => a.status === "flagged").length;
    return {
      answeredCount: ansCount,
      flaggedCount: flgCount,
      unansweredCount: questions.length - ansCount - flgCount,
      progressPercent: questions.length > 0 ? Math.round((ansCount / questions.length) * 100) : 0
    };
  }, [answers, questions.length]);

  const currentAnswer = answers[activeId];

  const getNavStyle = useCallback((qId: number) => {
    if (qId === activeId) return "bg-primary text-primary-foreground ring-2 ring-primary/20";
    const s = answers[qId]?.status;
    if (s === "answered") return "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20";
    if (s === "flagged") return "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 hover:bg-amber-500/20";
    return "bg-card text-muted-foreground border border-border hover:border-primary/50 hover:text-primary";
  }, [activeId, answers]);

  // Hindari render sebelum inisialisasi selesai (hidrasi timer aman)
  if (initialTime === null) return null;

  return (
    <TooltipProvider>
      {/* PERBAIKAN: Menggunakan struktur flex yang sama dengan dashboard layout */}
      <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        
        {/* PAUSE OVERLAY (BLOKIR UI SAAT OFFLINE / KELUAR TAB) */}
        {isPaused && (
          <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-md animate-in fade-in duration-300">
            {pauseReason === "offline" ? (
              <WifiOff className="mb-6 h-20 w-20 animate-pulse text-destructive" />
            ) : (
              <AlertCircle className="mb-6 h-20 w-20 animate-pulse text-amber-500" />
            )}
            <h2 className="mb-3 text-3xl font-bold">Ujian Dijeda Otomatis</h2>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              {pauseReason === "offline"
                ? "Koneksi internet Anda terputus. Waktu hitung mundur dihentikan sementara demi keadilan. Silakan periksa jaringan Anda."
                : "Sistem mendeteksi Anda keluar/beralih dari halaman ujian. Waktu hitung mundur dibekukan. Harap tetap fokus pada ujian Anda."}
            </p>
            
            <Button size="lg" onClick={() => setIsPaused(false)} className="px-8 text-sm font-bold" disabled={!navigator.onLine}>
              {navigator.onLine ? "Saya Sudah Kembali Siap" : "Menunggu Koneksi..."}
            </Button>
          </div>
        )}

        {/* AREA HEADER BAR */}
        {/* PERBAIKAN: Menambahkan 'backdrop-blur supports-[backdrop-filter]:bg-background/60' dan 'container mx-auto px-4 md:px-6' */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
                {TEXT_CONTENT.headerBadge}
              </div>
              <Separator orientation="vertical" className="hidden h-8 sm:block" />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold leading-tight">{TEXT_CONTENT.headerTitle}</h1>
                <p className="text-xs text-muted-foreground">{TEXT_CONTENT.headerSubtitle} {volumeId} · {packageTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* TOMBOL RESTART DI HEADER */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isPending} className="hidden hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive sm:flex">
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Restart Ujian
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin mengulang ujian?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua jawaban yang sudah Anda isi akan <strong>dihapus</strong> secara permanen dan waktu hitung mundur akan dikembalikan dari awal.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestart} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Ya, Ulangi Ujian
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Komponen Timer Di-Isolasi, menggunakan Key agar bisa diremount */}
              <ExamTimer 
                key={timerKey} 
                initialTimeLeft={initialTime} 
                isPaused={isPaused} 
                onExpire={handleAutoSubmit} 
                timeLeftRef={timeLeftRef} 
              />

            </div>
          </div>
        </header>

        {/* SEKSI UTAMA PLATFORM */}
        {/* PERBAIKAN: Menambahkan 'container mx-auto flex-1 px-4 py-6 md:px-6 md:py-8' agar grid berada di tengah dan ada jarak vertikal yang pas */}
        <main className={`container mx-auto flex-1 px-4 py-6 md:px-6 md:py-8 transition-opacity duration-300 ${isPaused ? "pointer-events-none select-none opacity-30 blur-sm" : "opacity-100"}`}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* AREA KIRI: BARIS KONTEN PERTANYAAN */}
            <div className="space-y-4 lg:col-span-8">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{TEXT_CONTENT.progressLabel}</span>
                  <span>{answeredCount} dari {questions.length} soal terjawab ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>

              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-muted/30 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {TEXT_CONTENT.questionNumberLabel} {currentIdx + 1}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                    {currentQuestion?.kategori}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-6 p-6 md:p-8">
                  <p className="whitespace-pre-line text-base leading-relaxed text-foreground select-none">
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
                          className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors
                            ${isSelected ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-border hover:border-border/80 hover:bg-muted/50"}`}
                        >
                          <RadioGroupItem value={opt.opsi} id={`opt-${opt.opsi}`} />
                          <span className={`text-sm ${isSelected ? "font-semibold text-primary" : "text-foreground"}`}>
                            {opt.opsi}. {opt.teks}
                          </span>
                        </Label>
                      );
                    })}
                  </RadioGroup>
                </CardContent>

                <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
                  <Button
                    variant="outline"
                    onClick={() => { if (currentIdx > 0) setActiveId(questions[currentIdx - 1].id); }}
                    disabled={currentIdx === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />{TEXT_CONTENT.actionPrev}
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={currentAnswer?.status === "flagged" ? "default" : "outline"}
                        className={currentAnswer?.status === "flagged"
                          ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                          : "border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-400"
                        }
                        onClick={handleFlag}
                      >
                        <AlertCircle className="mr-1.5 h-4 w-4" />
                        {currentAnswer?.status === "flagged" ? TEXT_CONTENT.actionUnflag : TEXT_CONTENT.actionFlag}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{TEXT_CONTENT.flagTooltip}</p></TooltipContent>
                  </Tooltip>

                  <Button
                    onClick={() => { if (currentIdx < questions.length - 1) setActiveId(questions[currentIdx + 1].id); }}
                    disabled={currentIdx === questions.length - 1}
                  >
                    {TEXT_CONTENT.actionNext}<ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* AREA KANAN: PANEL NAVIGASI ANGKA NOMOR */}
            <div className="space-y-4 lg:col-span-4">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b border-border px-5 py-3">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">{TEXT_CONTENT.sidebarTitle}</h2>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-primary/10 bg-primary/5 p-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-primary">{answeredCount}</span>
                      <span className="text-muted-foreground">{TEXT_CONTENT.statusAnswered}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-amber-500/10 bg-amber-500/5 p-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{flaggedCount}</span>
                      <span className="text-muted-foreground">{TEXT_CONTENT.statusFlagged}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted p-2">
                      <span className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
                      <span className="font-semibold text-foreground">{unansweredCount}</span>
                      <span className="text-muted-foreground">{TEXT_CONTENT.statusUnanswered}</span>
                    </div>
                  </div>

                  <ScrollArea className="h-80">
                    <div className="grid grid-cols-5 gap-1.5 pr-3 pt-1">
                      {questions.map((q, idx) => (
                        <button
                          key={q.id}
                          onClick={() => setActiveId(q.id)}
                          className={`h-9 w-full rounded-lg font-mono text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getNavStyle(q.id)}`}
                        >
                          {(idx + 1).toString().padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full bg-emerald-600 font-bold text-white hover:bg-emerald-700" disabled={isPending}>
                        {isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{TEXT_CONTENT.btnSubmitting}</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" />{TEXT_CONTENT.btnSubmit}</>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{TEXT_CONTENT.alertTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                          Kamu baru menjawab <strong>{answeredCount} dari {questions.length} soal</strong>.
                          {unansweredCount > 0 && ` Masih ada ${unansweredCount} soal yang belum dijawab.`}
                          {" "}Tindakan ini bersifat final, seluruh jawaban akan dikunci dan dinilai permanen oleh server.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>{TEXT_CONTENT.alertCancel}</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-emerald-600 text-white hover:bg-emerald-700" 
                          onClick={handleSubmitUjian}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : TEXT_CONTENT.alertConfirm}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

              {/* BOX TIPS TRICK BANNER */}
              <Card className="border-0 bg-primary text-primary-foreground shadow-sm">
                <CardContent className="p-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">{TEXT_CONTENT.tipsTitle}</p>
                  <p className="text-sm italic leading-relaxed opacity-90">
                    {TEXT_CONTENT.tipsDesc}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}