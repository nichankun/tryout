"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { SKD_TRAINING_THRESHOLDS } from "@/lib/constants/scoring";
import {
  questions,
  tryoutAttemptAnswers,
  tryoutAttempts,
  tryoutHistories,
  userAccess,
} from "@/db/database/schema";

const AttemptInputSchema = z.object({ attemptId: z.string().uuid() });
const ChoiceSchema = z.array(z.object({ opsi: z.string(), poin: z.number() }));

export async function submitTryoutAction(input: unknown): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = AttemptInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Sesi ujian tidak valid. Muat ulang halaman tryout.");
  }

  let result: { historyId: string; packageId: number };
  try {
    result = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(tryoutAttempts)
        .where(and(
          eq(tryoutAttempts.id, parsed.data.attemptId),
          eq(tryoutAttempts.userId, session.user.id),
        ))
        .for("update");

      if (!attempt) throw new Error("Sesi ujian tidak ditemukan.");
      if (attempt.historyId) return { historyId: attempt.historyId, packageId: attempt.packageId };
      if (attempt.status === "completed") throw new Error("Hasil ujian tidak ditemukan.");

      const [access] = await tx
        .select({ id: userAccess.id })
        .from(userAccess)
        .where(and(
          eq(userAccess.userId, session.user.id),
          eq(userAccess.packageId, attempt.packageId),
        ))
        .limit(1);

      if (!access) throw new Error("Akun ini tidak memiliki akses ke paket ujian.");

      const dbQuestions = await tx
        .select({ id: questions.id, kategori: questions.kategori, pilihan: questions.pilihan })
        .from(questions)
        .where(eq(questions.packageId, attempt.packageId));
      const savedAnswers = await tx
        .select({ questionId: tryoutAttemptAnswers.questionId, answer: tryoutAttemptAnswers.answer })
        .from(tryoutAttemptAnswers)
        .where(eq(tryoutAttemptAnswers.attemptId, attempt.id));

      if (dbQuestions.length === 0) throw new Error("Soal untuk paket ini tidak ditemukan.");

      const answerMap = new Map(savedAnswers.map((item) => [item.questionId, item.answer]));
      const answersForHistory: Record<string, string> = {};
      let skorTwk = 0;
      let skorTiu = 0;
      let skorTkp = 0;

      for (const question of dbQuestions) {
        const answer = answerMap.get(question.id);
        if (!answer) continue;

        answersForHistory[String(question.id)] = answer;
        const parsedChoices = ChoiceSchema.safeParse(question.pilihan);
        if (!parsedChoices.success) continue;

        const selectedChoice = parsedChoices.data.find((choice) => choice.opsi === answer);
        const points = selectedChoice?.poin ?? 0;

        if (question.kategori === "TWK") skorTwk += points;
        else if (question.kategori === "TIU") skorTiu += points;
        else if (question.kategori === "TKP") skorTkp += points;
      }

      const totalSkor = skorTwk + skorTiu + skorTkp;
      const isLolos =
        skorTwk >= SKD_TRAINING_THRESHOLDS.twk &&
        skorTiu >= SKD_TRAINING_THRESHOLDS.tiu &&
        skorTkp >= SKD_TRAINING_THRESHOLDS.tkp;
      const completedAt = new Date();

      const [history] = await tx
        .insert(tryoutHistories)
        .values({
          userId: session.user.id,
          packageId: attempt.packageId,
          skorTwk,
          skorTiu,
          skorTkp,
          totalSkor,
          isLolos,
          jawabanSiswa: answersForHistory,
          startTime: attempt.startedAt,
          endTime: completedAt,
        })
        .returning({ id: tryoutHistories.id });

      await tx
        .update(tryoutAttempts)
        .set({ status: "completed", submittedAt: completedAt, historyId: history.id })
        .where(eq(tryoutAttempts.id, attempt.id));

      return { historyId: history.id, packageId: attempt.packageId };
    });
  } catch (error) {
    console.error("[Submit Tryout Error]", error);
    throw new Error("Gagal memproses ujian. Silakan muat ulang atau hubungi bantuan.");
  }

  redirect(`/dashboard/${result.packageId}/hasil?historyId=${result.historyId}`);
}
