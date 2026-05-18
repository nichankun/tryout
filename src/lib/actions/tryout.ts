"use server";

/**
 * lib/actions/tryout.ts
 * * Server Action Produksi untuk memproses penyerahan (submit) jawaban ujian SKD.
 * Melakukan validasi sesi, menarik kunci jawaban asli langsung dari database (Secure Room),
 * mengkalkulasi skor per subtest secara otomatis, dan menyimpan rekam riwayat ke database.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const EXAM_CONFIG = {
  maxVolumeAllowed: 20,
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

const ACTION_ROUTES = {
  login: "/login",
  hasilRedirection: (volId: number, historyId: string) => `/tryout/${volId}/hasil?historyId=${historyId}`,
} as const;

// Schema Zod untuk validasi integritas struktur opsi pilihan ganda dari database (jsonb)
const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string(),
    poin: z.number(),
  })
);

// ── INTERFACES ──
type AnswerStatus = "answered" | "flagged" | "unanswered";

interface UserAnswer {
  selectedKey: string | null;
  status: AnswerStatus;
}

interface SubmitTryoutInput {
  volumeId: number;
  answers: Record<number, UserAnswer>; // Hanya menerima lembar jawaban milik user, bukan kunci jawaban
}

// ==========================================
// ACTION EXECUTION UTAMA
// ==========================================
export async function submitTryoutAction(input: SubmitTryoutInput): Promise<void> {
  const { volumeId, answers } = input;
  let targetHistoryId = "";

  // ── 1. PROTEKSI UTAMA (NextAuth v5 Server Session Check) ──
  const session = await auth();
  if (!session?.user?.id) {
    redirect(ACTION_ROUTES.login);
  }

  const userId = session.user.id;

  // ── 2. VALIDASI PARAMETER INPUT ──
  if (isNaN(volumeId) || volumeId < 1 || volumeId > EXAM_CONFIG.maxVolumeAllowed) {
    throw new Error("Akses penyerahan paket ujian tidak valid.");
  }

  try {
    // ── 3. VERIFIKASI HAK AKSES KEPEMILIKAN PAKET ──
    const hasAccess = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, volumeId)
      ),
    });

    if (!hasAccess) {
      throw new Error("Kamu tidak memiliki hak akses aktif untuk paket ujian ini.");
    }

    // ── 4. TARIK KUNCI JAWABAN & BOBOT ASLI DARI DATABASE (Anti-Cheat Room) ──
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.packageId, volumeId));

    if (dbQuestions.length === 0) {
      throw new Error("Konten database bank soal tidak ditemukan.");
    }

    // ── 5. INTEGRASI KALKULASI SKOR (Server-Side Calculation Engine) ──
    let skorTwk = 0;
    let skorTiu = 0;
    let skorTkp = 0;
    
    // Konversi bentuk struktur state answers agar gampang dicari berdasarkan ID database soal
    const jawabanUserFormatted = Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => v.selectedKey !== null)
        .map(([k, v]) => [k, v.selectedKey!])
    );

    for (const soal of dbQuestions) {
      const pilihanUser = jawabanUserFormatted[String(soal.id)];
      if (!pilihanUser) continue; // Skip jika soal dikosongkan/tidak dijawab

      // Parsing amankan kolom JSONB Drizzle menggunakan Zod
      const daftarPilihan = PilihanSchema.parse(soal.pilihan);
      const opsiTerpilih = daftarPilihan.find((p) => p.opsi === pilihanUser);
      if (!opsiTerpilih) continue;

      const perolehanPoin = opsiTerpilih.poin ?? 0;

      // Akumulasi skor berdasarkan kategori materi resmi BKN
      if (soal.kategori === "TWK") skorTwk += perolehanPoin;
      else if (soal.kategori === "TIU") skorTiu += perolehanPoin;
      else if (soal.kategori === "TKP") skorTkp += perolehanPoin; // TKP otomatis aman mendukung skala 1-5 dari DB
    }

    const totalSkor = skorTwk + skorTiu + skorTkp;
    const isLolosPassingGrade =
      skorTwk >= EXAM_CONFIG.passingGrade.twk &&
      skorTiu >= EXAM_CONFIG.passingGrade.tiu &&
      skorTkp >= EXAM_CONFIG.passingGrade.tkp;

    // ── 6. SIMPAN REKAM DATA RIWAYAT SELESAI UJIAN ──
    const [insertedRecord] = await db
      .insert(tryoutHistories)
      .values({
        userId: userId,
        packageId: volumeId,
        skorTwk,
        skorTiu,
        skorTkp,
        totalSkor,
        isLolos: isLolosPassingGrade,
        jawabanSiswa: jawabanUserFormatted, // Menyimpan rekap log string jawaban ("101": "A", "102": "C")
        endTime: new Date(),
      })
      .returning({ id: tryoutHistories.id });

    targetHistoryId = insertedRecord.id;

  } catch (error) {
    console.error("[Server Action Error] submitTryoutAction:", error);
    throw error;
  }

  // ── 7. REDIRECTION (Wajib dieksekusi di luar block try-catch Next.js) ──
  if (targetHistoryId) {
    redirect(ACTION_ROUTES.hasilRedirection(volumeId, targetHistoryId));
  }
}