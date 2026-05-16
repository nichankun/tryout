/**
 * components/exam-type-tabs.tsx
 *
 * ✅ Client Component — karena ada state (tab aktif)
 * ✅ React Compiler: TIDAK perlu useCallback manual, compiler otomatis memoize
 * ✅ Menggunakan shadcn Tabs di-style custom agar sesuai hero section
 */

"use client";

import { useState } from "react";

type ExamType = "SKD" | "SKB";

const TABS: { key: ExamType; label: string; sublabel: string }[] = [
  { key: "SKD", label: "SKD", sublabel: "110 Soal" },
  { key: "SKB", label: "SKB", sublabel: "Segera Hadir" },
];

export function ExamTypeTabs() {
  // ✅ React Compiler otomatis handle memoization — tidak perlu useCallback
  const [active, setActive] = useState<ExamType>("SKD");

  return (
    <div
      className="inline-flex bg-blue-700/50 p-1 rounded-full border border-blue-400/50"
      role="tablist"
      aria-label="Jenis ujian"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const isDisabled = tab.key === "SKB";

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
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-100 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
          >
            {tab.label}
            {isDisabled && (
              <span className="text-[10px] bg-blue-400/30 text-blue-200 px-1.5 py-0.5 rounded-full font-semibold tracking-wide">
                Segera
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}