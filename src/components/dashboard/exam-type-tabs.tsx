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
    // Menggunakan bg-purple-200/50 agar harmonis dengan background hero (purple-50) di Dashboard
    <div
      className="inline-flex items-center justify-center rounded-full bg-purple-200/50 p-1 text-purple-800/70"
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
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 gap-2
              ${
                isActive
                  ? "bg-background text-primary shadow-sm"
                  : "hover:text-primary"
              }`}
          >
            {tab.label}
            {isDisabled && (
              <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-900">
                {LABELS.badgeIncoming}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}