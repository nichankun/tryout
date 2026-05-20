"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, WifiOff } from "lucide-react";

interface TryoutPauseOverlayProps {
  isPaused: boolean;
  pauseReason: "offline" | "hidden" | null;
  onResume: () => void;
}

export const TryoutPauseOverlay = React.memo(({
  isPaused,
  pauseReason,
  onResume,
}: TryoutPauseOverlayProps) => {
  if (!isPaused) return null;

  const isOffline = pauseReason === "offline";
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-md animate-in fade-in duration-300">

      {/* Icon dalam lingkaran berwarna */}
      <div
        className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
          isOffline ? "bg-red-50" : "bg-amber-50"
        }`}
      >
        {isOffline ? (
          <WifiOff className="h-11 w-11 animate-pulse text-red-600" />
        ) : (
          <AlertCircle className="h-11 w-11 animate-pulse text-amber-600" />
        )}
      </div>

      {/* Judul */}
      <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
        Ujian Dijeda Otomatis
      </h2>

      {/* Deskripsi */}
      <p className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
        {isOffline
          ? "Koneksi internet Anda terputus. Waktu hitung mundur dihentikan sementara demi keadilan. Silakan periksa jaringan Anda."
          : "Sistem mendeteksi Anda keluar/beralih dari halaman ujian. Waktu hitung mundur dibekukan. Harap tetap fokus pada ujian Anda."}
      </p>

      {/* Tombol resume */}
      <Button
        size="lg"
        onClick={onResume}
        disabled={!isOnline}
        className={`px-8 text-sm font-bold ${
          isOnline
            ? "bg-primary text-primary-foreground hover:bg-purple-800"
            : "bg-purple-50 text-purple-200 cursor-not-allowed"
        }`}
      >
        {isOnline ? "Saya Sudah Kembali Siap" : "Menunggu Koneksi..."}
      </Button>

    </div>
  );
});
TryoutPauseOverlay.displayName = "TryoutPauseOverlay";