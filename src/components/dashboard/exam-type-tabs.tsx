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
    // Menggunakan variabel opasitas `primary-foreground` agar otomatis menyatu di dalam Hero Banner
    <div
      className="inline-flex bg-primary-foreground/10 p-1 rounded-full border border-primary-foreground/20"
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
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2
              ${isActive
                ? "bg-primary-foreground text-primary shadow-sm"
                : "text-primary-foreground/80 hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
          >
            {tab.label}
            {isDisabled && (
              <span className="text-[10px] bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold tracking-wide">
                {LABELS.badgeIncoming}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}