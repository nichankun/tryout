/**
 * app/tryout/[id]/page.tsx
 * * Server Component Utama Ruang Ujian CAT.
 * Mengamankan sesi dan menyuplai data soal berdasarkan Volume ID.
 */

import { db } from "@/db";
import { questions, tryoutPackages } from "@/db/database/schema";
import { eq, asc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import TryoutClient from "./tryout-client";

interface TryoutPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TryoutPage({ params }: TryoutPageProps) {
  // 1. Amankan Sesi Login Siswa di Sisi Server
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/tryout/${(await params).id}`);
  }

  const resolvedParams = await params;
  const volumeId = parseInt(resolvedParams.id, 10);

  if (isNaN(volumeId)) {
    notFound();
  }

  // 2. Ambil Informasi Manifes Paket Tryout
  const [packageData] = await db
    .select()
    .from(tryoutPackages)
    .where(eq(tryoutPackages.id, volumeId))
    .limit(1);

  if (!packageData) {
    notFound();
  }

  // 3. Tarik Bank Soal yang Terikat pada Volume Ini (Anti-Cheat Room)
  const rawQuestions = await db
    .select({
      id: questions.id,
      kategori: questions.kategori,
      pertanyaan: questions.pertanyaan,
      pilihan: questions.pilihan,
    })
    .from(questions)
    .where(eq(questions.packageId, volumeId))
    .orderBy(asc(questions.id));

  if (rawQuestions.length === 0) {
    notFound();
  }

  // Pemetaan tipe struktur data array JSONB untuk pilihan opsi ganda
  type PilihanStruktur = { opsi: string; teks: string; poin: number }[];

  const formattedQuestions = rawQuestions.map((q) => ({
    id: q.id,
    kategori: q.kategori as "TWK" | "TIU" | "TKP",
    pertanyaan: q.pertanyaan,
    pilihan: (q.pilihan as PilihanStruktur).map((p) => ({ opsi: p.opsi, teks: p.teks })),
  }));

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