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

const TABS_DATA: { key: ExamType; label: string; sublabel: string; isDisabled: boolean }[] = [
  { key: "SKD", label: "SKD", sublabel: "110 Soal",     isDisabled: false },
  { key: "SKB", label: "SKB", sublabel: "Segera Hadir", isDisabled: true },
];

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function ExamTypeTabs() {
  const [active, setActive] = useState<ExamType>("SKD");

  return (
    // Menggunakan bg-muted agar memiliki kontras yang baik untuk wadah tabs
    <div
      className="inline-flex items-center justify-center rounded-full bg-muted p-1 text-muted-foreground"
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
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2
              ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
          >
            {tab.label}
            {isDisabled && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                {LABELS.badgeIncoming}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}