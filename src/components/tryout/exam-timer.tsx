"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { TIMER_CONFIG } from "@/types/tryout";

interface ExamTimerProps {
  initialTimeLeft: number;
  isDisabled: boolean;
  onExpire: () => void;
}

export const ExamTimer = React.memo(({ initialTimeLeft, isDisabled, onExpire }: ExamTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const deadline = useRef(performance.now() + initialTimeLeft * 1000);
  const didExpire = useRef(false);

  useEffect(() => {
    if (isDisabled) return;

    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !didExpire.current) {
        didExpire.current = true;
        onExpire();
      }
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, [isDisabled, onExpire]);

  const isWarning = timeLeft < TIMER_CONFIG.warningThresholdSeconds;
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div
      role="timer"
      aria-label={`Sisa waktu ${minutes} menit ${seconds} detik`}
      className={`flex items-center gap-2.5 rounded-lg border-2 px-4 py-1.5 font-mono text-sm font-semibold tracking-wider shadow-sm transition-all ${
        isWarning
          ? "animate-pulse border-destructive bg-destructive/10 text-destructive shadow-destructive/20"
          : "border-primary/40 bg-primary/10 text-primary"
      }`}
    >
      <Clock className={`h-4 w-4 ${isWarning ? "animate-bounce" : ""}`} aria-hidden />
      <span>{minutes}:{seconds}</span>
    </div>
  );
});

ExamTimer.displayName = "ExamTimer";
