/**
 * app/api/submit/route.ts
 * * Route Handler Produksi untuk Pemrosesan Jawaban Tryout (Submit).
 * Dilengkapi dengan Atomic Transaction, Idempotency Check, dan Sanitasi Data.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const EXAM_CONFIG = {
  passingGrade: { twk: 65, tiu: 80, tkp: 166 },
} as const;

// Zod schema untuk validasi payload
const SubmitPayloadSchema = z.object({
  packageId: z.number().int().min(1),
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D", "E"])),
});

// Skema untuk memvalidasi JSONB pilihan dari Database
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
    // 1. Concurrent Fetching: Akses & Data Soal
    const [access, dbQuestions] = await Promise.all([
      db.query.userAccess.findFirst({
        where: and(eq(userAccess.userId, userId), eq(userAccess.packageId, packageId)),
        columns: { id: true }
      }),
      db.query.questions.findMany({
        where: eq(questions.packageId, packageId),
        columns: { id: true, kategori: true, pilihan: true }
      })
    ]);

    if (!access) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (dbQuestions.length === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // 2. Idempotency Check: Mencegah double submit dalam waktu < 5 detik
    const lastSubmit = await db.query.tryoutHistories.findFirst({
      where: and(eq(tryoutHistories.userId, userId), eq(tryoutHistories.packageId, packageId)),
      orderBy: [desc(tryoutHistories.endTime)],
      columns: { endTime: true }
    });

    if (lastSubmit && (new Date().getTime() - lastSubmit.endTime.getTime() < 5000)) {
      return NextResponse.json({ error: "SUBMIT_TOO_FAST" }, { status: 429 });
    }

    // 3. Kalkulasi Skor (CPU-Friendly & Secure)
    let skorTwk = 0, skorTiu = 0, skorTkp = 0;

    for (const soal of dbQuestions) {
      const jawabanUser = answers[String(soal.id)];
      if (!jawabanUser) continue;

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

    // 4. Atomic Transaction: Simpan Riwayat
    const [insertedHistory] = await db.transaction(async (tx) => {
      return await tx
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
    });

    return NextResponse.json({ success: true, historyId: insertedHistory.id });

  } catch (err) {
    console.error("[API ERROR] Submit:", err);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}