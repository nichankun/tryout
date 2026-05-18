"use client";

/**
 * components/dashboard/countdown-timer.tsx
 * 
 * Komponen penghitung mundur ujian (Timer) yang adaptif.
 * Menggunakan token warna semantik bawaan ekosistem untuk mendukung mode gelap/terang.
 */

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const TIMER_CONFIG = {
  warningThresholdSeconds: 300, // Ambang batas kritis: 5 menit (300 detik)
  padLength: 2,
  padChar: "0",
} as const;

interface CountdownTimerProps {
  initialSeconds: number; // Durasi ujian dalam satuan detik
  onTimeUp?: () => void;  // Callback eksekusi otomatis saat waktu habis
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
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

    // Pembersihan (cleanup) instans interval saat unmount komponen
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeUp]);

  // Transformasi kalkulasi representasi waktu (HH:MM:SS)
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isWarning = timeLeft > 0 && timeLeft < TIMER_CONFIG.warningThresholdSeconds;
  const isTimeUp = timeLeft <= 0;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-bold text-lg transition-colors border-2 shadow-sm",
        isTimeUp
          ? "bg-destructive text-destructive-foreground border-destructive"
          : isWarning
          ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
          : "bg-card text-foreground border-border"
      )}
    >
      <Timer 
        className={cn(
          "w-5 h-5 transition-colors", 
          isTimeUp 
            ? "text-destructive-foreground" 
            : isWarning 
            ? "text-destructive" 
            : "text-primary"
        )} 
        aria-hidden 
      />
      <span aria-live="polite" aria-atomic="true">
        {hours.toString().padStart(TIMER_CONFIG.padLength, TIMER_CONFIG.padChar)}:
        {minutes.toString().padStart(TIMER_CONFIG.padLength, TIMER_CONFIG.padChar)}:
        {seconds.toString().padStart(TIMER_CONFIG.padLength, TIMER_CONFIG.padChar)}
      </span>
    </div>
  );
}