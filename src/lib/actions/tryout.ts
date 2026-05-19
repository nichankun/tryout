"use server";

/**
 * lib/actions/tryout.ts
 * * Server Action Produksi untuk memproses penyerahan (submit) jawaban ujian SKD.
 * Dioptimalkan dengan Select spesifik (Partial Query) dan Defensive Parsing
 * untuk menjamin server tidak crash saat traffic ujian sedang tinggi.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// ==========================================
// KONSTANTA & KONFIGURASI 
// ==========================================
const EXAM_CONFIG = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

const ACTION_ROUTES = {
  login: "/login",
  hasilRedirection: (volId: number, historyId: string) => `/tryout/${volId}/hasil?historyId=${historyId}`,
} as const;

const ERROR_MESSAGES = {
  unauthorized: "Sesi tidak valid. Silakan login kembali.",
  invalidInput: "Akses penyerahan paket ujian tidak valid.",
  noAccess: "Kamu tidak memiliki hak akses aktif untuk paket ujian ini.",
  noContent: "Konten database bank soal tidak ditemukan.",
} as const;

// Schema Zod untuk validasi integritas struktur opsi pilihan ganda
const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string().optional(), // Teks tidak wajib untuk kalkulasi, buat optional agar fleksibel
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
  answers: Record<number, UserAnswer>;
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
    redirect(ACTION_ROUTES.login); // Langsung redirect jika unauthenticated
  }
  const userId = session.user.id;

  // ── 2. VALIDASI PARAMETER INPUT ──
  if (typeof volumeId !== 'number' || isNaN(volumeId) || volumeId < 1) {
    throw new Error(ERROR_MESSAGES.invalidInput);
  }

  try {
    // ── 3. VERIFIKASI HAK AKSES KEPEMILIKAN PAKET ──
    // OPTIMASI: Hanya select 'id' untuk meminimalkan beban load database
    const hasAccess = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, volumeId)
      ),
      columns: { id: true }, 
    });

    if (!hasAccess) {
      throw new Error(ERROR_MESSAGES.noAccess);
    }

    // ── 4. TARIK KUNCI JAWABAN & BOBOT ASLI DARI DATABASE ──
    // OPTIMASI: Jangan tarik teks soal dan pembahasan yang berat, cukup id, kategori, dan pilihan
    const dbQuestions = await db
      .select({
        id: questions.id,
        kategori: questions.kategori,
        pilihan: questions.pilihan,
      })
      .from(questions)
      .where(eq(questions.packageId, volumeId));

    if (dbQuestions.length === 0) {
      throw new Error(ERROR_MESSAGES.noContent);
    }

    // ── 5. INTEGRASI KALKULASI SKOR (Server-Side Engine) ──
    let skorTwk = 0;
    let skorTiu = 0;
    let skorTkp = 0;
    
    // Konversi bentuk struktur state answers agar gampang dicari berdasarkan ID database soal
    // Type dieksplisitkan agar cocok dengan definisi JSONB di schema.ts
    const jawabanUserFormatted: Record<string, string> = Object.fromEntries(
      Object.entries(answers)
        .filter(([, v]) => v.selectedKey !== null)
        .map(([k, v]) => [k, v.selectedKey as string])
    );

    for (const soal of dbQuestions) {
      const pilihanUser = jawabanUserFormatted[String(soal.id)];
      if (!pilihanUser) continue; // Skip jika soal dikosongkan/tidak dijawab

      // OPTIMASI DEFENSIVE: Gunakan safeParse agar server tidak crash total jika ada 1 soal corrupt di DB
      const parsedPilihan = PilihanSchema.safeParse(soal.pilihan);
      if (!parsedPilihan.success) {
        console.warn(`[Peringatan] Data pilihan ganda corrupt pada soal ID: ${soal.id}`);
        continue;
      }

      const daftarPilihan = parsedPilihan.data;
      const opsiTerpilih = daftarPilihan.find((p) => p.opsi === pilihanUser);
      
      if (!opsiTerpilih) continue;

      const perolehanPoin = opsiTerpilih.poin ?? 0;

      // Akumulasi skor berdasarkan kategori
      if (soal.kategori === "TWK") skorTwk += perolehanPoin;
      else if (soal.kategori === "TIU") skorTiu += perolehanPoin;
      else if (soal.kategori === "TKP") skorTkp += perolehanPoin;
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
        jawabanSiswa: jawabanUserFormatted, // Type casting aman selama format sesuai Record<string,string>
        endTime: new Date(),
      })
      .returning({ id: tryoutHistories.id });

    targetHistoryId = insertedRecord.id;

  } catch (error) {
    // Penanganan log error yang aman, tidak mengekspos stack-trace sensitif ke luar
    console.error(`[Submit Tryout Error] UserId: ${userId} | Volume: ${volumeId}`, error);
    throw new Error("Gagal memproses ujian. Silakan hubungi bantuan jika masalah berlanjut.");
  }

  // ── 7. REDIRECTION (Wajib dieksekusi di luar block try-catch Next.js) ──
  if (targetHistoryId) {
    redirect(ACTION_ROUTES.hasilRedirection(volumeId, targetHistoryId));
  }
}