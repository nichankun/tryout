"use client";

import * as React from "react";
import { TEXT_CONTENT } from "@/types/tryout";
import { ExamTimer } from "./exam-timer";

interface TryoutHeaderProps {
  packageTitle: string;
  isPending: boolean;
  initialTime: number;
  onAutoSubmit: () => void;
}

export const TryoutHeader = React.memo(({
  packageTitle,
  isPending,
  initialTime,
  onAutoSubmit,
}: TryoutHeaderProps) => (
  <header className="sticky top-0 z-50 w-full border-b border-purple-200 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/60">
    <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
          {TEXT_CONTENT.headerBadge}
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold leading-tight text-foreground">{TEXT_CONTENT.headerTitle}</h1>
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
