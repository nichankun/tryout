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
      <h2 className="mb-3 text-xl font-bold leading-tight tracking-tight text-foreground md:text-2xl">
        Ujian Terhenti Sementara
      </h2>

      {/* Deskripsi */}
      <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {isOffline
          ? "Koneksi internet terputus. Waktu ujian tetap berjalan dan jawaban hanya tersimpan setelah tersambung kembali. Periksa jaringan sebelum melanjutkan."
          : "Sistem mendeteksi Anda berpindah dari halaman ujian. Waktu ujian tetap berjalan. Kembali ke halaman untuk melanjutkan."}
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
