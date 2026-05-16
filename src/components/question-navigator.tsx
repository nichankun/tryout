"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface QuestionNavigatorProps {
  totalQuestions?: number;
  currentQuestionIndex: number;
  answers: Record<number, string>; // Contoh data: { 0: 'A', 5: 'C' }
  doubtQuestions: number[]; // Array index soal yg diragukan: [1, 10]
  onSelect: (index: number) => void;
}

export function QuestionNavigator({
  currentQuestionIndex,
  answers,
  doubtQuestions,
  onSelect,
}: QuestionNavigatorProps) {
  
  // Fungsi pembuat grid per kategori materi
  const renderGrid = (start: number, end: number, label: string) => (
    <div className="mb-6 last:mb-0">
      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center justify-between">
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
                "w-10 h-10 p-0 text-xs font-semibold rounded-xl transition-all border-2",
                isCurrent && "border-blue-600 ring-2 ring-blue-600/20",
                isAnswered && !isDoubt && "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white",
                isDoubt && "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:text-white",
                !isAnswered && !isDoubt && "text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                isCurrent && isAnswered && "ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">Navigasi Soal</h3>
      </div>

      {/* Grid Soal (Scrollable) */}
      <ScrollArea className="flex-1 p-4 h-100">
        {renderGrid(0, 30, "TWK (1-30)")}
        {renderGrid(30, 65, "TIU (31-65)")}
        {renderGrid(65, 110, "TKP (66-110)")}
      </ScrollArea>

      {/* Legenda Indikator Warna */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 grid grid-cols-2 gap-y-3 text-xs font-medium text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-blue-600 shadow-sm" /> Terjawab
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" /> Kosong
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-500 shadow-sm" /> Ragu-ragu
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-slate-900 bg-white dark:bg-slate-800" /> Posisi Saat Ini
        </div>
      </div>
      
    </div>
  );
}