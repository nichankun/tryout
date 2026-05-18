/**
 * app/api/submit/route.ts
 * 
 * Route Handler Produksi untuk Pemrosesan Jawaban Tryout (Submit).
 * Memverifikasi sesi NextAuth v5, memvalidasi payload & data JSONB menggunakan Zod,
 * melakukan kalkulasi skor akhir di sisi server (secure room), dan menyimpan riwayat ke DB.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const EXAM_CONFIG = {
  maxVolumeAllowed: 20,
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

const API_ERRORS = {
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  invalidPayload: "INVALID_PAYLOAD",
  notFound: "Soal untuk paket ini tidak ditemukan.",
  serverError: "Terjadi kesalahan sistem. Coba lagi nanti.",
} as const;

// Schema Zod untuk Validasi Input Payload dari Pengguna
const SubmitPayloadSchema = z.object({
  packageId: z
    .union([z.number(), z.string().transform((val) => parseInt(val, 10))])
    .pipe(z.number().int().min(1).max(EXAM_CONFIG.maxVolumeAllowed)),
  answers: z.record(
    z.string().regex(/^\d+$/, "ID Soal harus berupa string angka"),
    z.enum(["A", "B", "C", "D", "E"], { message: "Opsi pilihan tidak valid" })
  ),
});

// Schema Zod untuk Validasi Integritas Struktur Opsi Pilihan di Database (jsonb)
const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string(),
    poin: z.number(),
  })
);

// ==========================================
// METHOD HANDLER: POST
// ==========================================
export async function POST(request: Request) {
  // ── 1. PROTEKSI UTAMA (NextAuth v5 API Session Check) ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: API_ERRORS.unauthorized }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // ── 2. PARSE & VALIDASI PAYLOAD REQUEST BODY VIA ZOD ──
    const rawBody = await request.json();
    const parsedPayload = SubmitPayloadSchema.safeParse(rawBody);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: API_ERRORS.invalidPayload, details: parsedPayload.error.format() },
        { status: 400 }
      );
    }

    const { packageId, answers } = parsedPayload.data;

    // ── 3. VERIFIKASI HAK KEPEMILIKAN AKSES PAKET USER (Real DB Verification) ──
    const access = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, packageId)
      ),
    });

    if (!access) {
      return NextResponse.json({ error: API_ERRORS.forbidden }, { status: 403 });
    }

    // ── 4. TARIK DATA KUNCI JAWABAN ASLI DARI DATABASE ──
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.packageId, packageId));

    if (dbQuestions.length === 0) {
      return NextResponse.json({ error: API_ERRORS.notFound }, { status: 404 });
    }

    // ── 5. KALKULASI SKOR DI SISI SERVER (Secure Anti-Cheat Room) ──
    let skorTwk = 0;
    let skorTiu = 0;
    let skorTkp = 0;

    for (const soal of dbQuestions) {
      const jawabanUser = answers[String(soal.id)];
      if (!jawabanUser) continue; // Skip jika nomor soal ini dikosongkan oleh user

      // Validasi bentuk JSONB kolom pilihan di database demi keamanan runtime
      const daftarPilihan = PilihanSchema.parse(soal.pilihan);
      const opsiCocok = daftarPilihan.find((p) => p.opsi === jawabanUser);
      if (!opsiCocok) continue;

      const poin = opsiCocok.poin ?? 0;

      if (soal.kategori === "TWK") skorTwk += poin;
      else if (soal.kategori === "TIU") skorTiu += poin;
      else if (soal.kategori === "TKP") skorTkp += poin;
    }

    const totalSkor = skorTwk + skorTiu + skorTkp;
    const isLolosUjian =
      skorTwk >= EXAM_CONFIG.passingGrade.twk &&
      skorTiu >= EXAM_CONFIG.passingGrade.tiu &&
      skorTkp >= EXAM_CONFIG.passingGrade.tkp;

    // ── 6. SIMPAN LOG LOG RIWAYAT SELESAI UJIAN KE POSTGRESQL ──
    const [insertedHistory] = await db
      .insert(tryoutHistories)
      .values({
        userId: userId,
        packageId: packageId,
        skorTwk,
        skorTiu,
        skorTkp,
        totalSkor,
        isLolos: isLolosUjian,
        jawabanSiswa: answers,
        endTime: new Date(),
      })
      .returning({ id: tryoutHistories.id });

    return NextResponse.json({
      success: true,
      historyId: insertedHistory.id,
    });

  } catch (err) {
    console.error("[API ERROR] POST /api/submit:", err);
    return NextResponse.json({ error: API_ERRORS.serverError }, { status: 500 });
  }
}