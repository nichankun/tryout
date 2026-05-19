"use client";

/**
 * components/dashboard/countdown-timer.tsx
 * * Komponen penghitung mundur ujian (Timer) yang adaptif.
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
  isPaused?: boolean;     // Prop baru untuk Auto-Pause
  timeLeftRef?: React.MutableRefObject<number>; // Prop baru untuk Sinkronisasi LocalStorage
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function CountdownTimer({ initialSeconds, onTimeUp, isPaused = false, timeLeftRef }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    // Sinkronkan ref ke parent setiap kali re-render agar tersimpan di LocalStorage
    if (timeLeftRef) {
      timeLeftRef.current = timeLeft;
    }

    // Jika sedang dijeda (pindah tab/offline), interval tidak dijalankan sama sekali
    if (isPaused) {
      return;
    }

    if (timeLeft <= 0) {
      if (onTimeUp) {
        onTimeUp();
      }
      return;
    }

    // Kalkulasi target waktu absolut agar timer stabil dan tidak drift/melambat
    const targetTime = Date.now() + (timeLeft * 1000);

    const timerId = setInterval(() => {
      const newTimeLeft = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(newTimeLeft);
      
      if (timeLeftRef) {
        timeLeftRef.current = newTimeLeft;
      }

      if (newTimeLeft <= 0) {
        clearInterval(timerId);
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);

    // Pembersihan (cleanup) instans interval saat unmount komponen
    return () => clearInterval(timerId);
  }, [isPaused, onTimeUp, timeLeftRef]); // Dependensi `timeLeft` sengaja dihilangkan agar kalkulasi targetTime stabil per-resume

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