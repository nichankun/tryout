"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  initialSeconds: number; // Durasi ujian dalam detik (misal: 6000 untuk 100 menit)
  onTimeUp?: () => void;  // Callback saat waktu habis
}

export function CountdownTimer({ initialSeconds, onTimeUp }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    // Cleanup interval saat komponen di-unmount
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp]);

  // Format ke HH:MM:SS
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isWarning = timeLeft > 0 && timeLeft < 300; // Kurang dari 5 menit (300 detik)
  const isTimeUp = timeLeft <= 0;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-bold text-lg transition-colors border-2 shadow-sm",
        isTimeUp
          ? "bg-red-600 text-white border-red-600"
          : isWarning
          ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900 animate-pulse"
          : "bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800"
      )}
    >
      <Timer className={cn("w-5 h-5", isTimeUp ? "text-white" : isWarning ? "text-red-600 dark:text-red-400" : "text-blue-600")} />
      {hours.toString().padStart(2, '0')}:
      {minutes.toString().padStart(2, '0')}:
      {seconds.toString().padStart(2, '0')}
    </div>
  );
}