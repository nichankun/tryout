"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { RotateCcw } from "lucide-react";
import { TEXT_CONTENT } from "@/types/tryout";
import { ExamTimer } from "./exam-timer";

interface TryoutHeaderProps {
  volumeId: number;
  packageTitle: string;
  isPending: boolean;
  onRestart: () => void;
  timerKey: number;
  initialTime: number;
  isPaused: boolean;
  onAutoSubmit: () => void;
  timeLeftRef: React.RefObject<number | null>;
}

export const TryoutHeader = React.memo(({
  volumeId, packageTitle, isPending, onRestart,
  timerKey, initialTime, isPaused, onAutoSubmit, timeLeftRef,
}: TryoutHeaderProps) => (
  <header className="sticky top-0 z-50 w-full border-b border-purple-200 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60">
    <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">

      {/* ── KIRI: Badge + Judul ── */}
      <div className="flex items-center gap-3">
        {/* Badge CAT — ungu solid */}
        <div className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
          {TEXT_CONTENT.headerBadge}
        </div>

        <Separator orientation="vertical" className="hidden h-8 sm:block bg-purple-200" />

        <div className="hidden sm:block">
          <h1 className="text-sm font-bold leading-tight text-foreground">
            {TEXT_CONTENT.headerTitle}
          </h1>
          <p className="text-xs text-muted-foreground">
            {TEXT_CONTENT.headerSubtitle} {volumeId} · {packageTitle}
          </p>
        </div>
      </div>

      {/* ── KANAN: Restart + Timer ── */}
      <div className="flex items-center gap-2 sm:gap-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="flex border-purple-200 text-primary hover:border-red-400 hover:bg-red-50 hover:text-red-600"
            >
              <RotateCcw className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Restart Ujian</span>
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent className="border-purple-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-purple-900">
                Anda yakin ingin mengulang ujian?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Semua jawaban yang sudah Anda isi akan{" "}
                <strong className="text-foreground font-semibold">dihapus</strong> secara permanen dan waktu hitung
                mundur akan dikembalikan dari awal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isPending}
                className="border-purple-200 text-primary hover:bg-purple-50"
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onRestart}
                disabled={isPending}
                className="bg-red-600 text-white hover:bg-red-800"
              >
                Ya, Ulangi Ujian
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ExamTimer
          key={timerKey}
          initialTimeLeft={initialTime}
          isPaused={isPaused}
          onExpire={onAutoSubmit}
          timeLeftRef={timeLeftRef}
        />
      </div>

    </div>
  </header>
));
TryoutHeader.displayName = "TryoutHeader";