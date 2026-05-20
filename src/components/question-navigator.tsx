"use client";

/**
 * components/dashboard/question-navigator.tsx
 * 
 * Komponen Client untuk navigasi panel nomor soal CAT.
 * Terbagi otomatis per sub-materi SKD menggunakan token warna semantik yang adaptif.
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const TEXT_CONTENT = {
  headerTitle: "Navigasi Soal",
  legendAnswered: "Terjawab",
  legendEmpty: "Kosong",
  legendDoubt: "Ragu-ragu",
  legendCurrent: "Posisi Saat Ini",
} as const;

const EXAM_SECTIONS = [
  { label: "TWK (1-30)",   start: 0,  end: 30  },
  { label: "TIU (31-65)",  start: 30, end: 65  },
  { label: "TKP (66-110)", start: 65, end: 110 },
] as const;

interface QuestionNavigatorProps {
  totalQuestions?: number;
  currentQuestionIndex: number;
  answers: Record<number, string>; // Format data index: { 0: 'A', 5: 'C' }
  doubtQuestions: number[];        // Format data array index: [1, 10]
  onSelect: (index: number) => void;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function QuestionNavigator({
  currentQuestionIndex,
  answers,
  doubtQuestions,
  onSelect,
}: QuestionNavigatorProps) {
  
  // Fungsi pembangun struktur grid per kelompok materi SKD
  const renderGrid = (start: number, end: number, label: string) => (
    <div className="mb-6 last:mb-0">
      <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center justify-between tracking-wider">
        <span>{label}</span>
      </h4>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: end - start }).map((_, i) => {
          const qIndex = start + i;
          const isCurrent = currentQuestionIndex === qIndex;
          const isAnswered = answers[qIndex] !== undefined;
          const isDoubt = doubtQuestions.includes(qIndex);

          return (
            <Button
              key={qIndex}
              variant="outline"
              type="button"
              onClick={() => onSelect(qIndex)}
              className={cn(
                "w-10 h-10 p-0 text-xs font-bold rounded-xl transition-all border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isCurrent && "border-primary ring-2 ring-primary/20",
                isAnswered && !isDoubt && "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
                isDoubt && "bg-amber-400 text-white border-amber-400 hover:bg-amber-600",
                !isAnswered && !isDoubt && "text-muted-foreground border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                isCurrent && isAnswered && "ring-offset-2 ring-offset-background"
              )}
            >
              {qIndex + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden">
      
      {/* Batas Header Panel Navigasi */}
      <div className="p-4 border-b border-border bg-muted/40">
        <h3 className="font-bold text-foreground tracking-tight">{TEXT_CONTENT.headerTitle}</h3>
      </div>

      {/* Konten Area Grid Soal (Dukungan Scrollable) */}
      <ScrollArea className="flex-1 p-4 h-100">
        {EXAM_SECTIONS.map((section) => 
          renderGrid(section.start, section.end, section.label)
        )}
      </ScrollArea>

      {/* Legenda Blok Petunjuk Indikator Status Warna */}
      <div className="p-4 border-t border-border bg-muted/20 grid grid-cols-2 gap-y-3 text-xs font-semibold text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-primary shadow-sm" /> 
          {TEXT_CONTENT.legendAnswered}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded border-2 border-muted-foreground/30 bg-card" /> 
          {TEXT_CONTENT.legendEmpty}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-400 shadow-sm" /> 
          {TEXT_CONTENT.legendDoubt}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded ring-2 ring-primary ring-offset-1 ring-offset-background bg-card" /> 
          {TEXT_CONTENT.legendCurrent}
        </div>
      </div>
      
    </div>
  );
}