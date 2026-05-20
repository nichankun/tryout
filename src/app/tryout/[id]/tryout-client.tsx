"use client";

/**
 * app/tryout/[id]/tryout-client.tsx
 * Client Component Simulator CAT Premium (100% Strict Type Safe & Ultra Optimized).
 * Berfungsi sebagai Layout/Orchestrator Ujian untuk menghubungkan Header, Overlay, dan Main Content.
 */

import * as React from "react";
import { useTransition, useCallback, useMemo, useEffect, useState, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { submitTryoutAction } from "@/lib/actions/tryout";
import { TIMER_CONFIG, Question, UserAnswer, AnswerStatus } from "@/types/tryout";
import { TryoutHeader } from "@/components/tryout/tryout-header";
import { TryoutPauseOverlay } from "@/components/tryout/tryout-pause-overlay";
import { TryoutMain } from "@/components/tryout/tryout-main";

interface TryoutClientProps {
  volumeId: number;
  packageTitle: string;
  questions: Question[];
  userName: string;
  userImage?: string;
}

export default function TryoutClient({
  volumeId,
  packageTitle,
  questions,
}: TryoutClientProps) {
  const [activeId, setActiveId] = useState<number>(questions[0]?.id ?? 1);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});

  // State manajemen timer
  const [initialTime, setInitialTime] = useState<number | null>(null);
  const [timerKey, setTimerKey] = useState<number>(0);
  const timeLeftRef = useRef(TIMER_CONFIG.durationSeconds);

  // Auto-pause states
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<"offline" | "hidden" | null>(null);

  const [isPending, startTransition] = useTransition();

  const STORAGE_KEY = `cat_exam_session_vol_${volumeId}`;

  // ── 1. SINKRONISASI LOG STATE (LOCAL STORAGE) ──
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setAnswers(parsed.answers || {});

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
      setAnswers(
        Object.fromEntries(
          questions.map((q) => [
            q.id,
            { selectedKey: null, status: "unanswered" as AnswerStatus },
          ])
        )
      );
      setInitialTime(TIMER_CONFIG.durationSeconds);
    }
  }, [STORAGE_KEY, questions]);

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
        if (navigator.onLine) {
          setIsPaused(false);
          setPauseReason(null);
        } else {
          setPauseReason("offline");
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
  const handleAnswer = useCallback(
    (key: string) => {
      setAnswers((prev) => ({
        ...prev,
        [activeId]: {
          selectedKey: key,
          status:
            prev[activeId]?.status === "flagged" ? "flagged" : "answered",
        },
      }));
    },
    [activeId]
  );

  const handleFlag = useCallback(() => {
    setAnswers((prev) => {
      const current = prev[activeId];
      return {
        ...prev,
        [activeId]: {
          ...current,
          status:
            current?.status === "flagged"
              ? current?.selectedKey
                ? "answered"
                : "unanswered"
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

  const handleRestart = useCallback(() => {
    if (isPending) return;

    const emptyAnswers = Object.fromEntries(
      questions.map((q) => [
        q.id,
        { selectedKey: null, status: "unanswered" as AnswerStatus },
      ])
    );

    setAnswers(emptyAnswers);
    setActiveId(questions[0]?.id ?? 1);

    setInitialTime(TIMER_CONFIG.durationSeconds);
    timeLeftRef.current = TIMER_CONFIG.durationSeconds;
    setTimerKey((prev) => prev + 1);
    localStorage.removeItem(STORAGE_KEY);
    setIsPaused(false);
  }, [isPending, questions, STORAGE_KEY]);

  // ── 4. DERIVED METRICS ──
  const { currentQuestion, currentIdx } = useMemo(() => {
    const idx = questions.findIndex((q) => q.id === activeId);
    return {
      currentQuestion: questions[idx] || questions[0],
      currentIdx: idx !== -1 ? idx : 0,
    };
  }, [activeId, questions]);

  const { answeredCount, flaggedCount, unansweredCount, progressPercent } =
    useMemo(() => {
      const vals = Object.values(answers);
      const ansCount = vals.filter((a) => a.status === "answered").length;
      const flgCount = vals.filter((a) => a.status === "flagged").length;
      return {
        answeredCount: ansCount,
        flaggedCount: flgCount,
        unansweredCount: questions.length - ansCount - flgCount,
        progressPercent:
          questions.length > 0
            ? Math.round((ansCount / questions.length) * 100)
            : 0,
      };
    }, [answers, questions.length]);

  const currentAnswer = answers[activeId];

  // ── Gaya navigasi soal — konsisten dengan palette ungu project ──
  const getNavStyle = useCallback(
    (qId: number) => {
      // Soal aktif: ungu solid
      if (qId === activeId)
        return "bg-primary text-primary-foreground ring-2 ring-primary/20";

      const s = answers[qId]?.status;

      // Sudah dijawab: ungu muda
      if (s === "answered")
        return "bg-purple-50 text-primary border border-purple-200 hover:bg-purple-100";

      // Ditandai (ragu): amber
      if (s === "flagged")
        return "bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100/40";

      // Belum dijawab: netral
      return "bg-card text-muted-foreground border border-border hover:border-purple-200 hover:text-primary";
    },
    [activeId, answers]
  );

  if (initialTime === null) return null;

  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">

        <TryoutPauseOverlay
          isPaused={isPaused}
          pauseReason={pauseReason}
          onResume={() => setIsPaused(false)}
        />

        <TryoutHeader
          volumeId={volumeId}
          packageTitle={packageTitle}
          isPending={isPending}
          onRestart={handleRestart}
          timerKey={timerKey}
          initialTime={initialTime}
          isPaused={isPaused}
          onAutoSubmit={handleSubmitUjian}
          timeLeftRef={timeLeftRef}
        />

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
          onSubmit={handleSubmitUjian}
          getNavStyle={getNavStyle}
        />

      </div>
    </TooltipProvider>
  );
}