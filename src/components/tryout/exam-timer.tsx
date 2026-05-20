"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { TIMER_CONFIG } from "@/types/tryout";

interface ExamTimerProps {
  initialTimeLeft: number;
  isPaused: boolean;
  onExpire: () => void;
  timeLeftRef: React.RefObject<number | null>; // <-- Standar baru React 19
}

export const ExamTimer = React.memo(({ 
  initialTimeLeft, 
  isPaused, 
  onExpire,
  timeLeftRef 
}: ExamTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    if (isPaused) return;

    if (timeLeft <= 0) {
      onExpire();
      return;
    }

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
  }, [isPaused, onExpire, timeLeftRef]); 

  const isWarning = timeLeft < TIMER_CONFIG.warningThresholdSeconds;
  const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const s = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div 
      className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg border-2 font-mono font-bold text-base tracking-wider transition-all shadow-sm
        ${isWarning 
          ? "bg-destructive/10 border-destructive text-destructive animate-pulse shadow-destructive/20" 
          : "bg-primary/10 border-primary/40 text-primary"
        }`}
    >
      <Clock className={`h-4 w-4 ${isWarning ? "animate-bounce" : ""}`} />
      <span>{m}:{s}</span>
    </div>
  );
});
ExamTimer.displayName = "ExamTimer";