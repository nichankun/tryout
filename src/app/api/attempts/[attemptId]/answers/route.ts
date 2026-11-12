import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutAttemptAnswers, tryoutAttempts } from "@/db/database/schema";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";
import { isTrustedRequestOrigin } from "@/lib/security/request-origin";

export const dynamic = "force-dynamic";

const AnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  isFlagged: z.boolean(),
});

interface RouteProps {
  params: Promise<{ attemptId: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  }

  const { attemptId } = await params;
  const parsedId = z.string().uuid().safeParse(attemptId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "INVALID_ATTEMPT" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const parsedBody = AnswerSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const rateLimit = await consumeAccountRateLimit({
    namespace: "attempt-answer",
    headers: request.headers,
    identifier: `${session.user.id}:${parsedId.data}`,
    limit: 360,
    windowMs: 5 * 60 * 1000,
  });
  if (rateLimit.storageUnavailable) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  const result = await db.transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(tryoutAttempts)
      .where(and(
        eq(tryoutAttempts.id, parsedId.data),
        eq(tryoutAttempts.userId, session.user.id),
      ))
      .for("update");

    if (!attempt) return "NOT_FOUND" as const;
    if (attempt.status !== "in_progress") return "ATTEMPT_CLOSED" as const;

    const now = new Date();
    if (attempt.expiresAt <= now) {
      await tx
        .update(tryoutAttempts)
        .set({ status: "expired" })
        .where(eq(tryoutAttempts.id, attempt.id));
      return "ATTEMPT_EXPIRED" as const;
    }

    const [question] = await tx
      .select({ id: questions.id })
      .from(questions)
      .where(and(
        eq(questions.id, parsedBody.data.questionId),
        eq(questions.packageId, attempt.packageId),
      ))
      .limit(1);

    if (!question) return "QUESTION_NOT_FOUND" as const;

    if (parsedBody.data.answer === null && !parsedBody.data.isFlagged) {
      await tx
        .delete(tryoutAttemptAnswers)
        .where(and(
          eq(tryoutAttemptAnswers.attemptId, attempt.id),
          eq(tryoutAttemptAnswers.questionId, question.id),
        ));
    } else {
      await tx
        .insert(tryoutAttemptAnswers)
        .values({
          attemptId: attempt.id,
          questionId: question.id,
          answer: parsedBody.data.answer,
          isFlagged: parsedBody.data.isFlagged,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [tryoutAttemptAnswers.attemptId, tryoutAttemptAnswers.questionId],
          set: {
            answer: parsedBody.data.answer,
            isFlagged: parsedBody.data.isFlagged,
            updatedAt: now,
          },
        });
    }

    return "SAVED" as const;
  });

  if (result === "SAVED") return NextResponse.json({ success: true });
  if (result === "NOT_FOUND") return NextResponse.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  if (result === "QUESTION_NOT_FOUND") return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });
  if (result === "ATTEMPT_EXPIRED") return NextResponse.json({ error: result }, { status: 409 });
  return NextResponse.json({ error: result }, { status: 409 });
}
