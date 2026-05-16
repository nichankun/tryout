"use server";

/**
 * lib/actions/tryout.ts
 *
 * ✅ Server Action untuk submit jawaban dan hitung nilai SKD
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Sistem penilaian SKD BKN resmi
const SKOR = {
  benar: 5,
  salah: 0,
  tidakDijawab: 0,
  // TKP tidak ada jawaban salah — semua opsi punya bobot 1–5
};

type AnswerStatus = "answered" | "flagged" | "unanswered";

interface UserAnswer {
  selectedKey: string | null;
  status: AnswerStatus;
}

interface SubmitTryoutInput {
  volumeId: number;
  answers: Record<number, UserAnswer>;
  // Kunci jawaban — di production ambil dari DB
  answerKey: Record<number, string>;
}

export async function submitTryoutAction(input: SubmitTryoutInput): Promise<void> {
  const { volumeId, answers, answerKey } = input;

  // Cek session
  const cookieStore = await cookies();
  const session = cookieStore.get("asn_session")?.value;
  if (!session) redirect("/login");

  // Hitung skor per subtest
  // Soal 1–30: TWK, 31–80: TIU, 81–110: TKP
  let twk = 0, tiu = 0, tkp = 0;

  for (let i = 1; i <= 110; i++) {
    const userAnswer = answers[i]?.selectedKey;
    const correct = answerKey[i];
    const isCorrect = userAnswer === correct;
    const poin = isCorrect ? SKOR.benar : SKOR.salah;

    if (i <= 30) twk += poin;
    else if (i <= 80) tiu += poin;
    else tkp += poin;
  }

  // ── Production: simpan ke database ──
  // await prisma.tryoutResult.create({
  //   data: {
  //     userId: session.userId,
  //     volumeId,
  //     twk, tiu, tkp,
  //     total: twk + tiu + tkp,
  //     answers: JSON.stringify(answers),
  //     completedAt: new Date(),
  //   }
  // });

  console.log(`[Mock] Hasil tryout vol ${volumeId}: TWK=${twk} TIU=${tiu} TKP=${tkp}`);

  // Redirect ke halaman hasil setelah submit
  redirect(`/tryout/${volumeId}/hasil`);
}