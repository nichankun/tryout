/**
 * types/tryout.ts
 *
 * Type definitions untuk halaman tryout.
 * FiguralTipe disimpan di sini sebagai single source of truth,
 * lalu di-re-export ke figural-renderer.tsx agar tidak duplikat.
 */

// ==========================================
// KONSTANTA KONFIGURASI TIMER
// ==========================================
export const TIMER_CONFIG = {
  durationSeconds: 100 * 60,
  warningThresholdSeconds: 10 * 60,
} as const;

// ==========================================
// KONSTANTA TEKS UI
// ==========================================
export const TEXT_CONTENT = {
  headerBadge:      "CAT",
  headerTitle:      "Ujian Seleksi Kompetensi Dasar",
  headerSubtitle:   "SKD CPNS 2026 · Vol.",
  progressLabel:    "Progress Pengerjaan",
  questionNumberLabel: "Soal Nomor",
  actionPrev:       "Sebelumnya",
  actionNext:       "Selanjutnya",
  actionFlag:       "Ragu-Ragu",
  actionUnflag:     "Batalkan Ragu",
  flagTooltip:      "Tandai soal ini untuk ditinjau kembali",
  sidebarTitle:     "Navigasi Soal",
  statusAnswered:   "Terjawab",
  statusFlagged:    "Ragu-Ragu",
  statusUnanswered: "Belum",
  btnSubmit:        "Selesai Ujian",
  btnSubmitting:    "Mengirim...",
  alertTitle:       "Yakin ingin mengakhiri ujian?",
  alertCancel:      "Kembali ke Ujian",
  alertConfirm:     "Ya, Selesaikan",
  tipsTitle:        "Tips Ujian",
  tipsDesc:         "Kerjakan soal yang paling mudah terlebih dahulu. Gunakan fitur Ragu-Ragu untuk menandai soal yang ingin ditinjau ulang.",
} as const;

// ==========================================
// TIPE ENUM
// ==========================================
export type SubTest      = "TWK" | "TIU" | "TKP";
export type AnswerStatus = "answered" | "flagged" | "unanswered";

// ==========================================
// FIGURAL — single source of truth
// ==========================================
/**
 * Semua tipe figural yang didukung oleh FiguralRenderer.
 * Dipakai di sini (Question) DAN di figural-renderer.tsx.
 * Jangan definisikan ulang di tempat lain.
 */
export type FiguralTipe =
  | "deret_rotasi"
  | "matriks"
  | "pencerminan"
  | "analogi_gambar"
  | "analogi_matriks"
  | "ketidaksamaan"
  | "deret_bangun"
  | "tumpukan_balok";

export interface FiguralConfig {
  tipe: FiguralTipe;
  /**
   * Array nilai per frame/opsi deret.
   * - number → sudut rotasi (deret_rotasi, deret_bangun, tumpukan_balok)
   * - string → nama pola (pencerminan: "asli"|"cermin_h"|"cermin_v"|"cermin_hv")
   */
  deretSoal: (string | number)[];
}

// ==========================================
// PILIHAN SOAL
// ==========================================
export interface QuestionChoice {
  opsi:  string;  // "A", "B", "C", "D", "E"
  teks:  string;
  poin?: number;  // TKP: 1-5 | TIU/TWK: 0 atau 5
  /**
   * Sudut/nilai figural untuk opsi ini.
   * Gunakan `null` (bukan `undefined`) agar konsisten dengan kolom DB.
   */
  figuralAngle?: number | null;
}

// ==========================================
// SOAL
// ==========================================
export interface Question {
  id:         number;
  kategori:   SubTest;
  pertanyaan: string;

  /** Apakah soal ini bergambar figural prosedural? */
  isFigural?:     boolean | null;
  /** Konfigurasi deret gambar figural (hanya ada jika isFigural = true) */
  figuralConfig?: FiguralConfig | null;

  pilihan: QuestionChoice[];
}

// ==========================================
// JAWABAN SISWA (STATE LOKAL)
// ==========================================
export interface UserAnswer {
  selectedKey: string | null;
  status:      AnswerStatus;
}