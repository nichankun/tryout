"use client";

import * as React from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetTrigger } from "@/components/ui/sheet";
import { TEXT_CONTENT } from "@/types/tryout";
import { ExamTimer } from "./exam-timer";

interface TryoutHeaderProps {
  packageTitle: string;
  isPending: boolean;
  initialTime: number;
  currentQuestionNumber: number;
  totalQuestions: number;
  onAutoSubmit: () => void;
}

export const TryoutHeader = React.memo(({
  packageTitle,
  isPending,
  initialTime,
  currentQuestionNumber,
  totalQuestions,
  onAutoSubmit,
}: TryoutHeaderProps) => (
  <header className="sticky top-0 z-50 w-full border-b border-purple-200 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60">
    <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 md:h-16 md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <div className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground md:px-3 md:py-1.5 md:text-sm">
          {TEXT_CONTENT.headerBadge}
        </div>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0 gap-1.5 rounded-lg border-purple-200 px-2.5 text-xs font-semibold text-primary hover:bg-purple-50 hover:text-primary lg:hidden"
            aria-label={`Buka navigasi soal. Soal ${currentQuestionNumber} dari ${totalQuestions} sedang dibuka.`}
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Soal</span>
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] tabular-nums">
              {String(currentQuestionNumber).padStart(2, "0")} / {totalQuestions}
            </span>
          </Button>
        </SheetTrigger>
        <div className="hidden min-w-0 sm:block">
          <h1 className="text-sm font-semibold leading-tight text-foreground">{TEXT_CONTENT.headerTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {TEXT_CONTENT.headerSubtitle} {packageTitle}
          </p>
        </div>
      </div>
      <ExamTimer initialTimeLeft={initialTime} onExpire={onAutoSubmit} isDisabled={isPending} />
    </div>
  </header>
));

TryoutHeader.displayName = "TryoutHeader";
