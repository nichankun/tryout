"use client";

/**
 * components/tryout/tryout-main.tsx
 *
 * Komponen utama area pengerjaan soal tryout.
 * Menampilkan gambar soal dan pilihan yang diunggah admin.
 */

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, LayoutGrid, BookOpen, Loader2,
} from "lucide-react";

import { TEXT_CONTENT, Question, UserAnswer } from "@/types/tryout";

// ==========================================
// PROPS
// ==========================================
interface TryoutMainProps {
  isPaused:        boolean;
  isPending:       boolean;
  questions:       Question[];
  currentQuestion: Question;
  currentIdx:      number;
  activeId:        number;
  setActiveId:     (id: number) => void;
  currentAnswer:   UserAnswer;
  answeredCount:   number;
  flaggedCount:    number;
  unansweredCount: number;
  progressPercent: number;
  onAnswer:        (key: string) => void;
  onFlag:          () => void;
  onSubmit:        () => void;
  getNavStyle:     (qId: number) => string;
  getNavLabel:     (qId: number) => string;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export const TryoutMain = React.memo((props: TryoutMainProps) => {
  const {
    isPaused, isPending, questions, currentQuestion, currentIdx, activeId,
    setActiveId, currentAnswer, answeredCount, flaggedCount,
    unansweredCount, progressPercent, onAnswer, onFlag, onSubmit, getNavStyle, getNavLabel,
  } = props;

  return (
    <main
      className={`container mx-auto flex-1 px-4 py-6 md:px-6 md:py-8 transition-opacity duration-300 ${
        isPaused
          ? "pointer-events-none select-none opacity-30 blur-sm"
          : "opacity-100"
      }`}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* ── AREA KIRI: KONTEN PERTANYAAN ── */}
        <div className="space-y-4 lg:col-span-8">

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{TEXT_CONTENT.progressLabel}</span>
              <span>
                {answeredCount} dari {questions.length} soal terjawab ({progressPercent}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-200/30">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="sticky top-[4.5rem] z-30 flex h-11 w-full items-center justify-between border-purple-200 bg-card shadow-sm lg:hidden"
                aria-label={`Buka navigasi soal. Soal ${currentIdx + 1} dari ${questions.length} sedang dibuka.`}
              >
                <span className="inline-flex items-center gap-2 font-bold text-purple-900">
                  <LayoutGrid className="size-4 text-primary" aria-hidden="true" />
                  Navigasi soal
                </span>
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-primary">
                  {String(currentIdx + 1).padStart(2, "0")} / {questions.length}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-[82dvh] max-h-[82dvh] gap-0 rounded-t-2xl border-purple-200 p-0 lg:hidden"
            >
              <SheetHeader className="shrink-0 border-b border-purple-100 pr-4">
                <SheetTitle className="text-lg font-extrabold text-purple-950">Navigasi soal</SheetTitle>
                <SheetDescription>
                  {answeredCount} terjawab · {flaggedCount} ragu-ragu · {unansweredCount} belum dijawab
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 px-4 py-4">
                <div className="grid grid-cols-5 gap-2 pb-2 sm:grid-cols-7">
                  {questions.map((question, idx) => {
                    return (
                      <SheetClose asChild key={question.id}>
                        <button
                          type="button"
                          aria-label={`Soal ${idx + 1}, ${getNavLabel(question.id)}`}
                          aria-current={question.id === activeId ? "step" : undefined}
                          onClick={() => setActiveId(question.id)}
                          className={`h-11 w-full rounded-lg font-mono text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getNavStyle(question.id)}`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </button>
                      </SheetClose>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 border-t border-purple-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-primary" />Sedang dibuka</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-purple-200" />Terjawab</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-amber-500" />Ragu-ragu</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-border bg-card" />Belum</span>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="ml-auto h-8 rounded-lg px-3 text-xs">
                    Tutup navigasi
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          {/* Card soal */}
          <Card className="overflow-hidden border-purple-200 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-purple-200 bg-purple-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-sm font-bold text-primary">
                  {TEXT_CONTENT.questionNumberLabel} {currentIdx + 1}
                </span>
              </div>
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {currentQuestion?.kategori}
              </span>
            </CardHeader>

            <CardContent className="space-y-5 p-6 md:p-8">
              {/* Teks Pertanyaan */}
              <p className="select-none whitespace-pre-line text-base leading-relaxed text-foreground">
                {currentQuestion?.pertanyaan}
              </p>

              {currentQuestion.imageUrl && (
                <div className="relative aspect-[16/9] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-white">
                  <Image
                    src={currentQuestion.imageUrl}
                    alt={currentQuestion.imageAlt || "Gambar soal"}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-contain p-3"
                  />
                </div>
              )}

              {currentQuestion.legacyImageMissing && (
                <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
                  Gambar soal ini belum diperbarui. Hubungi pengelola paket sebelum melanjutkan.
                </div>
              )}

              {/* ── PILIHAN GANDA ── */}
              <RadioGroup
                value={currentAnswer?.selectedKey ?? ""}
                onValueChange={onAnswer}
                className="space-y-2.5"
              >
                {currentQuestion?.pilihan.map((opt) => {
                  const isSelected = currentAnswer?.selectedKey === opt.opsi;

                  const hasImageOption = Boolean(opt.imageUrl);

                  return (
                    <Label
                      key={opt.opsi}
                      htmlFor={`opt-${opt.opsi}`}
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                        isSelected
                          ? "border-primary bg-purple-50"
                          : "border-border hover:border-purple-200 hover:bg-purple-50/30"
                      }`}
                    >
                      <RadioGroupItem value={opt.opsi} id={`opt-${opt.opsi}`} className="mt-1" />
                      <div className="flex flex-col flex-1 gap-2">
                        <span
                          className={`text-sm ${
                            isSelected ? "font-semibold text-primary" : "text-foreground"
                          }`}
                        >
                          {opt.opsi}. {opt.teks}
                        </span>

                        {/* Gambar opsi yang diunggah admin */}
                        {hasImageOption && (
                          <div className="mt-1 block">
                            <div className="relative aspect-square w-36 overflow-hidden rounded-md border border-border bg-white p-1 shadow-sm sm:w-44">
                              <Image
                                src={opt.imageUrl!}
                                alt={opt.imageAlt || `Gambar pilihan ${opt.opsi}`}
                                fill
                                unoptimized
                                sizes="176px"
                                className="object-contain p-2"
                              />
                            </div>
                          </div>
                        )}
                        {/* 👆 ------------------------------------------ 👆 */}
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </CardContent>

            <CardFooter className="flex flex-wrap justify-between gap-3 border-t border-purple-200/40 bg-purple-50/30 px-5 py-3">
              {/* Tombol Sebelumnya */}
              <Button
                variant="outline"
                onClick={() => {
                  if (currentIdx > 0) setActiveId(questions[currentIdx - 1].id);
                }}
                disabled={currentIdx === 0}
                className="border-purple-200 text-primary hover:bg-purple-50 hover:text-purple-800"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {TEXT_CONTENT.actionPrev}
              </Button>

              {/* Tombol Ragu-Ragu */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentAnswer?.status === "flagged" ? "default" : "outline"}
                    className={
                      currentAnswer?.status === "flagged"
                        ? "border-amber-100 bg-amber-50 text-amber-600 hover:bg-amber-100/40"
                        : "border-amber-100/50 text-amber-600 hover:bg-amber-50/60"
                    }
                    onClick={onFlag}
                  >
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    {currentAnswer?.status === "flagged"
                      ? TEXT_CONTENT.actionUnflag
                      : TEXT_CONTENT.actionFlag}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{TEXT_CONTENT.flagTooltip}</p>
                </TooltipContent>
              </Tooltip>

              {/* Tombol Selanjutnya */}
              <Button
                onClick={() => {
                  if (currentIdx < questions.length - 1)
                    setActiveId(questions[currentIdx + 1].id);
                }}
                disabled={currentIdx === questions.length - 1}
                className="bg-primary text-primary-foreground hover:bg-purple-800"
              >
                {TEXT_CONTENT.actionNext}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── AREA KANAN: PANEL NAVIGASI ── */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="overflow-hidden border-purple-200 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b border-purple-200 bg-purple-50 px-5 py-3">
              <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-sm font-bold text-purple-900">
                {TEXT_CONTENT.sidebarTitle}
              </h2>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {/* Stat mini: Dijawab / Ragu / Kosong */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 p-2.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden />
                  <span className="font-extrabold text-teal-600">{answeredCount}</span>
                  <span className="text-primary">{TEXT_CONTENT.statusAnswered}</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-amber-100 bg-amber-50 p-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                  <span className="font-extrabold text-amber-600">{flaggedCount}</span>
                  <span className="text-amber-600">{TEXT_CONTENT.statusFlagged}</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
                  <span className="h-4 w-4 rounded border-2 border-gray-400" />
                  <span className="font-extrabold text-gray-900">{unansweredCount}</span>
                  <span className="text-gray-600">{TEXT_CONTENT.statusUnanswered}</span>
                </div>
              </div>

              {/* Grid navigasi nomor soal */}
              <ScrollArea className="h-80">
                <div className="grid grid-cols-5 gap-1.5 pr-3 pt-1">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      aria-label={`Soal ${idx + 1}, ${getNavLabel(q.id)}`}
                      aria-current={q.id === activeId ? "step" : undefined}
                      onClick={() => setActiveId(q.id)}
                      className={`h-9 w-full rounded-lg font-mono text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getNavStyle(q.id)}`}
                    >
                      {(idx + 1).toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Tombol Submit */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-primary font-bold text-primary-foreground hover:bg-purple-800"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {TEXT_CONTENT.btnSubmitting}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {TEXT_CONTENT.btnSubmit}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="border-purple-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-purple-900">
                      {TEXT_CONTENT.alertTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Kamu baru menjawab{" "}
                      <strong className="font-semibold text-foreground">
                        {answeredCount} dari {questions.length} soal
                      </strong>
                      .
                      {unansweredCount > 0 &&
                        ` Masih ada ${unansweredCount} soal yang belum dijawab.`}{" "}
                      Tindakan ini bersifat final, seluruh jawaban akan dikunci
                      dan dinilai permanen oleh server.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={isPending}
                      className="border-purple-200 text-primary hover:bg-purple-50"
                    >
                      {TEXT_CONTENT.alertCancel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onSubmit}
                      disabled={isPending}
                      className="bg-primary text-primary-foreground hover:bg-purple-800"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        TEXT_CONTENT.alertConfirm
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Tips card */}
          <div className="rounded-2xl bg-primary px-5 py-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-100">
              {TEXT_CONTENT.tipsTitle}
            </p>
            <p className="text-sm italic leading-relaxed text-purple-50">
              {TEXT_CONTENT.tipsDesc}
            </p>
          </div>
        </div>

      </div>
    </main>
  );
});

TryoutMain.displayName = "TryoutMain";
