import { NextResponse } from "next/server";
import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutAttemptAnswers, tryoutAttempts, questions, userAccess } from "@/db/database/schema";
import { TIMER_CONFIG } from "@/types/tryout";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const StartAttemptSchema = z.object({
  packageId: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const parsed = StartAttemptSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { packageId } = parsed.data;
  const rateLimit = await consumeAccountRateLimit({
    namespace: "attempt-start",
    headers: request.headers,
    identifier: session.user.id,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (rateLimit.storageUnavailable) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  const [access, firstQuestion] = await Promise.all([
    db.query.userAccess.findFirst({
      where: and(eq(userAccess.userId, session.user.id), eq(userAccess.packageId, packageId)),
      columns: { id: true },
    }),
    db.query.questions.findFirst({
      where: eq(questions.packageId, packageId),
      columns: { id: true },
    }),
  ]);

  if (!access) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!firstQuestion) return NextResponse.json({ error: "NO_QUESTIONS" }, { status: 404 });

  const now = new Date();
  let attempt: typeof tryoutAttempts.$inferSelect;

  try {
    attempt = await db.transaction(async (tx) => {
      await tx
        .update(tryoutAttempts)
        .set({ status: "expired" })
        .where(and(
          eq(tryoutAttempts.userId, session.user.id),
          eq(tryoutAttempts.packageId, packageId),
          eq(tryoutAttempts.status, "in_progress"),
          lte(tryoutAttempts.expiresAt, now),
        ));

      const [activeAttempt] = await tx
        .select()
        .from(tryoutAttempts)
        .where(and(
          eq(tryoutAttempts.userId, session.user.id),
          eq(tryoutAttempts.packageId, packageId),
          eq(tryoutAttempts.status, "in_progress"),
        ))
        .limit(1);

      if (activeAttempt) return activeAttempt;

      const [createdAttempt] = await tx
        .insert(tryoutAttempts)
        .values({
          userId: session.user.id,
          packageId,
          startedAt: now,
          expiresAt: new Date(now.getTime() + TIMER_CONFIG.durationSeconds * 1000),
        })
        .returning();

      return createdAttempt;
    });
  } catch (error) {
    // A simultaneous page load may win the partial unique index race.
    const [activeAttempt] = await db
      .select()
      .from(tryoutAttempts)
      .where(and(
        eq(tryoutAttempts.userId, session.user.id),
        eq(tryoutAttempts.packageId, packageId),
        eq(tryoutAttempts.status, "in_progress"),
      ))
      .limit(1);

    if (!activeAttempt) {
      console.error("[POST /api/attempts] Gagal membuat sesi ujian:", error);
      return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }

    attempt = activeAttempt;
  }

  const answers = await db
    .select({
      questionId: tryoutAttemptAnswers.questionId,
      answer: tryoutAttemptAnswers.answer,
      isFlagged: tryoutAttemptAnswers.isFlagged,
    })
    .from(tryoutAttemptAnswers)
    .where(eq(tryoutAttemptAnswers.attemptId, attempt.id));

  const serverNow = new Date();
  return NextResponse.json({
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    serverNow: serverNow.toISOString(),
    answers,
  });
}
