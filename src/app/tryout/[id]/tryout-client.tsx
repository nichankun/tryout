"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { submitTryoutAction } from "@/lib/actions/tryout";
import type { AnswerStatus, Question, UserAnswer } from "@/types/tryout";
import { TryoutHeader } from "@/components/tryout/tryout-header";
import { TryoutPauseOverlay } from "@/components/tryout/tryout-pause-overlay";
import { TryoutMain } from "@/components/tryout/tryout-main";

type ChoiceKey = "A" | "B" | "C" | "D" | "E";

interface AttemptResponse {
  attemptId: string;
  status: "in_progress" | "expired";
  expiresAt: string;
  serverNow: string;
  answers: { questionId: number; answer: ChoiceKey | null; isFlagged: boolean }[];
}

interface TryoutClientProps {
  volumeId: number;
  packageTitle: string;
  questions: Question[];
  userName: string;
  userImage?: string;
}

export default function TryoutClient({ volumeId, packageTitle, questions }: TryoutClientProps) {
  const [activeId, setActiveId] = useState<number>(questions[0]?.id ?? 1);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [initialTime, setInitialTime] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<"offline" | "hidden" | null>(null);
  const [isPending, startTransition] = useTransition();
  const startAttemptRequest = useRef<Promise<AttemptResponse> | null>(null);
  const pendingSaves = useRef(new Map<number, Promise<void>>());

  const startAttempt = useCallback(() => {
    if (startAttemptRequest.current) return startAttemptRequest.current;

    const request = (async () => {
      let response: Response;
      try {
        response = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: volumeId }),
          cache: "no-store",
        });
      } catch {
        throw new Error("Tidak dapat terhubung ke server tryout. Pastikan server berjalan dan coba lagi.");
      }

      const result = await response.json().catch(() => null) as ({ error?: string } & Partial<AttemptResponse>) | null;
      if (!response.ok) {
        const errorCode = result?.error;
        const retryAfterSeconds = Number(response.headers.get("Retry-After"));
        const retryAfter = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? `${Math.ceil(retryAfterSeconds / 60)} menit`
          : "beberapa menit";
        const errorMessages: Record<string, string> = {
          UNAUTHORIZED: "Sesi login berakhir. Masuk kembali lalu buka paket tryout.",
          FORBIDDEN_ORIGIN: "Permintaan sesi ditolak. Muat ulang halaman tryout dari alamat aplikasi.",
          FORBIDDEN: "Paket ini belum terbuka untuk akun kamu.",
          INVALID_PAYLOAD: "Data paket tryout tidak valid. Muat ulang halaman.",
          NO_QUESTIONS: "Paket ini belum memiliki soal.",
          SERVICE_UNAVAILABLE: "Layanan pembuka sesi sedang tidak tersedia. Coba lagi beberapa saat.",
          TOO_MANY_ATTEMPTS: `Terlalu banyak percobaan memulai sesi. Coba lagi dalam ${retryAfter}.`,
          INTERNAL_ERROR: "Server gagal menyiapkan sesi ujian. Coba lagi beberapa saat.",
        };
        throw new Error(errorCode
          ? errorMessages[errorCode] ?? `Sesi gagal dimulai (HTTP ${response.status}, ${errorCode}).`
          : `Server menolak memulai sesi (HTTP ${response.status}).`);
      }

      if (!result) throw new Error("Server mengirim data sesi yang tidak valid. Coba muat ulang halaman.");

      const attempt = result as AttemptResponse;
      if (attempt.status !== "in_progress") {
        throw new Error("Sesi sebelumnya sudah berakhir. Coba lagi untuk memulai sesi baru.");
      }
      return attempt;
    })();

    startAttemptRequest.current = request;
    void request.catch(() => {
      if (startAttemptRequest.current === request) startAttemptRequest.current = null;
    });
    return request;
  }, [volumeId]);

  const applyAttempt = useCallback((attempt: AttemptResponse) => {
    const savedAnswers = new Map(attempt.answers.map((item) => [item.questionId, item]));
    const restoredAnswers = Object.fromEntries(
      questions.map((question) => {
        const savedAnswer = savedAnswers.get(question.id);
        const selectedKey = savedAnswer?.answer ?? null;
        return [question.id, {
          selectedKey,
          status: savedAnswer?.isFlagged
            ? "flagged" as AnswerStatus
            : selectedKey ? "answered" as AnswerStatus : "unanswered" as AnswerStatus,
        }];
      })
    );

    setAttemptId(attempt.attemptId);
    setAnswers(restoredAnswers);
    setInitialTime(Math.max(0, Math.ceil((Date.parse(attempt.expiresAt) - Date.parse(attempt.serverNow)) / 1000)));
    setLoadError(null);
  }, [questions]);

  useEffect(() => {
    let cancelled = false;
    void startAttempt()
      .then((attempt) => {
        if (!cancelled) applyAttempt(attempt);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Sesi ujian gagal dimulai.");
      });
    return () => { cancelled = true; };
  }, [applyAttempt, startAttempt]);

  const saveAnswer = useCallback((questionId: number, answer: ChoiceKey | null, isFlagged: boolean): Promise<void> => {
    if (!attemptId) return Promise.reject(new Error("Sesi ujian belum siap."));

    setSaveError(null);
    const previousSave = pendingSaves.current.get(questionId) ?? Promise.resolve();
    const nextSave = previousSave.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer, isFlagged }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (body?.error === "ATTEMPT_EXPIRED") return;
        throw new Error("Jawaban belum tersimpan di server.");
      }
    });

    pendingSaves.current.set(questionId, nextSave);
    void nextSave.then(
      () => {
        if (pendingSaves.current.get(questionId) === nextSave) pendingSaves.current.delete(questionId);
      },
      () => {
        if (pendingSaves.current.get(questionId) === nextSave) pendingSaves.current.delete(questionId);
        setSaveError("Ada jawaban yang belum tersimpan. Periksa koneksi lalu tekan Selesai Ujian lagi.");
      },
    );
    return nextSave;
  }, [attemptId]);

  const handleAnswer = useCallback((key: string) => {
    if (isPaused || isPending || !attemptId || !["A", "B", "C", "D", "E"].includes(key)) return;

    const selectedKey = key as ChoiceKey;
    const isFlagged = answers[activeId]?.status === "flagged";
    setAnswers((previous) => ({
      ...previous,
      [activeId]: {
        selectedKey,
        status: previous[activeId]?.status === "flagged" ? "flagged" : "answered",
      },
    }));
    void saveAnswer(activeId, selectedKey, isFlagged);
  }, [activeId, answers, attemptId, isPaused, isPending, saveAnswer]);

  const handleFlag = useCallback(() => {
    if (isPaused || isPending || !attemptId) return;

    const current = answers[activeId];
    const selectedKey = (current?.selectedKey ?? null) as ChoiceKey | null;
    const isFlagged = current?.status !== "flagged";
    setAnswers((previous) => ({
      ...previous,
      [activeId]: {
        selectedKey,
        status: isFlagged ? "flagged" : selectedKey ? "answered" : "unanswered",
      },
    }));
    void saveAnswer(activeId, selectedKey, isFlagged);
  }, [activeId, answers, attemptId, isPaused, isPending, saveAnswer]);

  const handleSubmitUjian = useCallback((automatic = false) => {
    if (isPending || !attemptId) return;

    startTransition(async () => {
      const pending = Object.entries(answers)
        .filter(([, answer]) => answer.selectedKey !== null || answer.status === "flagged")
        .map(([questionId, answer]) => saveAnswer(
          Number(questionId),
          answer.selectedKey as ChoiceKey | null,
          answer.status === "flagged",
        ));
      const results = await Promise.allSettled(pending);

      if (!automatic && results.some((result) => result.status === "rejected")) {
        setSaveError("Jawaban belum seluruhnya tersimpan. Periksa koneksi lalu coba lagi.");
        return;
      }

      try {
        await submitTryoutAction({ attemptId });
      } catch (error) {
        console.error("Gagal menyelesaikan sesi ujian:", error);
        setSaveError("Hasil belum dapat disimpan. Periksa koneksi lalu tekan Selesai Ujian lagi.");
      }
    });
  }, [answers, attemptId, isPending, saveAnswer]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
        setPauseReason("hidden");
      } else if (navigator.onLine) {
        setIsPaused(false);
        setPauseReason(null);
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
      }
    };

    if (!navigator.onLine) handleOffline();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const { currentQuestion, currentIdx } = useMemo(() => {
    const idx = questions.findIndex((question) => question.id === activeId);
    return {
      currentQuestion: questions[idx] || questions[0],
      currentIdx: idx !== -1 ? idx : 0,
    };
  }, [activeId, questions]);

  const { answeredCount, flaggedCount, unansweredCount, progressPercent } = useMemo(() => {
    const values = Object.values(answers);
    const answered = values.filter((answer) => answer.selectedKey !== null).length;
    const flagged = values.filter((answer) => answer.status === "flagged").length;
    return {
      answeredCount: answered,
      flaggedCount: flagged,
      unansweredCount: values.filter((answer) => answer.selectedKey === null).length,
      progressPercent: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0,
    };
  }, [answers, questions.length]);

  const currentAnswer = answers[activeId];
  const getNavStyle = useCallback((questionId: number) => {
    if (questionId === activeId) return "bg-primary text-primary-foreground ring-2 ring-primary/20";
    const status = answers[questionId]?.status;
    if (status === "answered") return "bg-purple-50 text-primary border border-purple-200 hover:bg-purple-100";
    if (status === "flagged") return "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100/40";
    return "bg-card text-muted-foreground border border-border hover:border-purple-200 hover:text-primary";
  }, [activeId, answers]);
  const getNavLabel = useCallback((questionId: number) => {
    if (questionId === activeId) return "sedang dibuka";
    const answer = answers[questionId];
    if (answer?.status === "flagged") return "ragu-ragu";
    if (answer?.selectedKey) return "terjawab";
    return "belum dijawab";
  }, [activeId, answers]);

  if (loadError) {
    const retryStartAttempt = () => {
      void startAttempt().then(applyAttempt).catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Sesi ujian gagal dimulai.");
      });
    };

    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p role="alert" className="text-sm text-destructive">{loadError}</p>
        <Button onClick={retryStartAttempt}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (initialTime === null || !attemptId) return null;

  return (
    <TooltipProvider>
      <Sheet>
        <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
          <TryoutPauseOverlay isPaused={isPaused} pauseReason={pauseReason} onResume={() => setIsPaused(false)} />

          <TryoutHeader
            packageTitle={packageTitle}
            isPending={isPending}
            initialTime={initialTime}
            currentQuestionNumber={currentIdx + 1}
            totalQuestions={questions.length}
            onAutoSubmit={() => handleSubmitUjian(true)}
          />

          {saveError && (
            <div role="alert" className="mx-auto mt-3 w-full max-w-5xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {saveError}
            </div>
          )}

          <TryoutMain
            isPaused={isPaused}
            isPending={isPending}
            questions={questions}
            currentQuestion={currentQuestion}
            currentIdx={currentIdx}
            activeId={activeId}
            setActiveId={setActiveId}
            currentAnswer={currentAnswer}
            answeredCount={answeredCount}
            flaggedCount={flaggedCount}
            unansweredCount={unansweredCount}
            progressPercent={progressPercent}
            onAnswer={handleAnswer}
            onFlag={handleFlag}
            onSubmit={() => handleSubmitUjian(false)}
            getNavStyle={getNavStyle}
            getNavLabel={getNavLabel}
          />
        </div>
      </Sheet>
    </TooltipProvider>
  );
}
