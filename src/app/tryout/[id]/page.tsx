/**
 * app/tryout/[id]/page.tsx
 * Server Component untuk Ruang Ujian CAT.
 */

import { notFound, redirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import type { FiguralTipe } from "@/types/tryout";
import { auth } from "@/auth";
import { db } from "@/db";
import { questions, tryoutPackages, userAccess } from "@/db/database/schema";
import TryoutClient from "./tryout-client";

// ==========================================
// TYPES & CONFIG
// ==========================================
interface TryoutPageProps {
  params: Promise<{ id: string }>;
}

type SanitizedQuestion = {
  id: number;
  kategori: "TWK" | "TIU" | "TKP";
  pertanyaan: string;
  isFigural: boolean | null;
  figuralConfig: { tipe: FiguralTipe; deretSoal: (string | number)[] } | null;
  pilihan: { opsi: string; teks: string; figuralAngle?: string | number | null }[];
};

export const dynamic = "force-dynamic";

// ==========================================
// MAIN COMPONENT
// ==========================================
export default async function TryoutPage({ params }: TryoutPageProps) {
  const [resolvedParams, session] = await Promise.all([params, auth()]);
  const volumeId = parseInt(resolvedParams.id, 10);

  if (isNaN(volumeId)) notFound();

  // 1. Auth Guard
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${volumeId}`);
  }

  // 2. Access Validation
  const accessRecord = await db.query.userAccess.findFirst({
    where: and(
      eq(userAccess.userId, session.user.id),
      eq(userAccess.packageId, volumeId)
    ),
    columns: { id: true },
  });

  if (!accessRecord) {
    redirect(`/checkout/${volumeId}`);
  }

  // 3. Fetch Data (Parallel)
  const [packageData, rawQuestions] = await Promise.all([
    db.query.tryoutPackages.findFirst({
      where: eq(tryoutPackages.id, volumeId),
      columns: { title: true },
    }),
    db.query.questions.findMany({
      where: eq(questions.packageId, volumeId),
      columns: {
        id: true,
        kategori: true,
        pertanyaan: true,
        pilihan: true,
        isFigural: true,
        figuralConfig: true,
      },
      orderBy: [asc(questions.id)],
    }),
  ]);

  if (!packageData || rawQuestions.length === 0) {
    notFound();
  }

  // 4. Data Sanitization (Security Layer)
const formattedQuestions: SanitizedQuestion[] = rawQuestions.map((q) => ({
  id: q.id,
  kategori: q.kategori as "TWK" | "TIU" | "TKP",
  pertanyaan: q.pertanyaan,
  isFigural: q.isFigural ?? null,
  figuralConfig: q.figuralConfig
    ? {
        tipe: q.figuralConfig.tipe as FiguralTipe,
        deretSoal: q.figuralConfig.deretSoal,
      }
    : null,
  pilihan: q.pilihan.map((p) => ({
    opsi: p.opsi,
    teks: p.teks,
    figuralAngle: p.figuralAngle ?? null,
  })),
}));
  // 5. Render
  return (
    <TryoutClient
      volumeId={volumeId}
      packageTitle={packageData.title}
      questions={formattedQuestions}
      userName={session.user.name ?? "Peserta Ujian"}
      userImage={session.user.image ?? undefined}
    />
  );
}