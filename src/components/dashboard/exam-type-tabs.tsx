"use client";

/**
 * components/dashboard/exam-type-tabs.tsx
 */

import { useState } from "react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
type ExamType = "SKD" | "SKB";

const LABELS = {
  ariaLabel: "Jenis ujian",
  badgeIncoming: "Segera",
} as const;

const TABS_DATA: { key: ExamType; label: string; isDisabled: boolean }[] = [
  { key: "SKD", label: "SKD", isDisabled: false },
  { key: "SKB", label: "SKB", isDisabled: true },
];

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function ExamTypeTabs() {
  const [active, setActive] = useState<ExamType>("SKD");

  return (
    <div
      className="inline-flex items-center justify-center gap-1 rounded-2xl border border-purple-200/80 bg-white/70 p-1 shadow-sm backdrop-blur-sm"
      role="tablist"
      aria-label={LABELS.ariaLabel}
    >
      {TABS_DATA.map((tab) => {
        const isActive = active === tab.key;
        const isDisabled = tab.isDisabled;

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => setActive(tab.key)}
            className={`inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-purple-50 hover:text-primary"
              }`}
          >
            {tab.label}
            {isDisabled && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                {LABELS.badgeIncoming}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
