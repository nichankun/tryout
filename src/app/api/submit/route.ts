/**
 * app/api/submit/route.ts
 * * Route Handler Produksi untuk Pemrosesan Jawaban Tryout (Submit).
 * Dioptimalkan dengan Partial Query (Memory Efficiency) dan 
 * kalkulasi skor yang lebih efisien (CPU Friendly).
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const EXAM_CONFIG = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

// Zod schema untuk validasi payload masuk
const SubmitPayloadSchema = z.object({
  packageId: z.number().int().min(1),
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D", "E"])),
});

// Skema untuk memvalidasi JSONB dari DB
const PilihanSchema = z.array(z.object({ opsi: z.string(), poin: z.number() }));

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = session.user.id;
  const rawBody = await request.json();
  const parsed = SubmitPayloadSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD", details: parsed.error.format() }, { status: 400 });
  }

  const { packageId, answers } = parsed.data;

  try {
    // ── 1. PARALLEL CHECK: Akses & Soal ──
    const [access, dbQuestions] = await Promise.all([
      db.query.userAccess.findFirst({
        where: and(eq(userAccess.userId, userId), eq(userAccess.packageId, packageId)),
        columns: { id: true }
      }),
      db.query.questions.findMany({
        where: eq(questions.packageId, packageId),
        columns: { id: true, kategori: true, pilihan: true } // OPTIMASI: Hanya tarik kolom yang perlu
      })
    ]);

    if (!access) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (dbQuestions.length === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // ── 2. KALKULASI SKOR (CPU-Friendly) ──
    let skorTwk = 0, skorTiu = 0, skorTkp = 0;

    for (const soal of dbQuestions) {
      const jawabanUser = answers[String(soal.id)];
      if (!jawabanUser) continue;

      // Sanitasi JSONB dengan safeParse
      const pilihan = PilihanSchema.safeParse(soal.pilihan);
      if (!pilihan.success) continue;

      const opsi = pilihan.data.find((p) => p.opsi === jawabanUser);
      const poin = opsi?.poin ?? 0;

      if (soal.kategori === "TWK") skorTwk += poin;
      else if (soal.kategori === "TIU") skorTiu += poin;
      else if (soal.kategori === "TKP") skorTkp += poin;
    }

    const totalSkor = skorTwk + skorTiu + skorTkp;
    const isLolosUjian =
      skorTwk >= EXAM_CONFIG.passingGrade.twk &&
      skorTiu >= EXAM_CONFIG.passingGrade.tiu &&
      skorTkp >= EXAM_CONFIG.passingGrade.tkp;

    // ── 3. SIMPAN RIWAYAT ──
    const [insertedHistory] = await db
      .insert(tryoutHistories)
      .values({
        userId,
        packageId,
        skorTwk,
        skorTiu,
        skorTkp,
        totalSkor,
        isLolos: isLolosUjian,
        jawabanSiswa: answers,
        endTime: new Date(),
      })
      .returning({ id: tryoutHistories.id });

    return NextResponse.json({ success: true, historyId: insertedHistory.id });

  } catch (err) {
    console.error("[API ERROR] Submit:", err);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}