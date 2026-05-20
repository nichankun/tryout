export const TIMER_CONFIG = {
  durationSeconds: 100 * 60,
  warningThresholdSeconds: 10 * 60,
} as const;

export const TEXT_CONTENT = {
  headerBadge: "CAT",
  headerTitle: "Ujian Seleksi Kompetensi Dasar",
  headerSubtitle: "SKD CPNS 2026 · Vol.",
  progressLabel: "Progress Pengerjaan",
  questionNumberLabel: "Soal Nomor",
  actionPrev: "Sebelumnya",
  actionNext: "Selanjutnya",
  actionFlag: "Ragu-Ragu",
  actionUnflag: "Batalkan Ragu",
  flagTooltip: "Tandai soal ini untuk ditinjau kembali",
  sidebarTitle: "Navigasi Soal",
  statusAnswered: "Terjawab",
  statusFlagged: "Ragu-Ragu",
  statusUnanswered: "Belum",
  btnSubmit: "Selesai Ujian",
  btnSubmitting: "Mengirim...",
  alertTitle: "Yakin ingin mengakhiri ujian?",
  alertCancel: "Kembali ke Ujian",
  alertConfirm: "Ya, Selesaikan",
  tipsTitle: "Tips Ujian",
  tipsDesc: "Kerjakan soal yang paling mudah terlebih dahulu. Gunakan fitur Ragu-Ragu untuk menandai soal yang ingin ditinjau ulang.",
} as const;

export type SubTest = "TWK" | "TIU" | "TKP";
export type AnswerStatus = "answered" | "flagged" | "unanswered";

export interface Question {
  id: number;
  kategori: SubTest;
  pertanyaan: string;
  pilihan: { opsi: string; teks: string; poin?: number }[];
}

export interface UserAnswer {
  selectedKey: string | null;
  status: AnswerStatus;
}