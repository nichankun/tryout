/**
 * app/tryout/[id]/page.tsx
 * * Server Component Utama Ruang Ujian CAT.
 * Mengamankan sesi, memvalidasi kepemilikan akses, dan menyuplai data soal berdasarkan Volume ID.
 */

import { db } from "@/db";
import { questions, tryoutPackages, userAccess } from "@/db/database/schema";
import { eq, asc, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import TryoutClient from "./tryout-client";

interface TryoutPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TryoutPage({ params }: TryoutPageProps) {
  // ── 1. Amankan Sesi Login Siswa di Sisi Server ──
  const resolvedParams = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${resolvedParams.id}`);
  }

  const volumeId = parseInt(resolvedParams.id, 10);
  if (isNaN(volumeId)) notFound();

  // ── 2. Validasi Kepemilikan Akses Volume ──
  // Middleware tidak lagi mengecek ini, jadi wajib divalidasi di page level.
  const [access] = await db
    .select()
    .from(userAccess)
    .where(
      and(
        eq(userAccess.userId, session.user.id),
        eq(userAccess.packageId, volumeId)
      )
    )
    .limit(1);

  if (!access) {
    // Belum punya akses → arahkan ke checkout
    redirect(`/checkout/${volumeId}`);
  }

  // ── 3. Ambil Informasi Manifes Paket Tryout ──
  const [packageData] = await db
    .select()
    .from(tryoutPackages)
    .where(eq(tryoutPackages.id, volumeId))
    .limit(1);

  if (!packageData) notFound();

  // ── 4. Tarik Bank Soal yang Terikat pada Volume Ini ──
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

  if (rawQuestions.length === 0) notFound();

  // ── 5. Pemetaan Tipe Struktur Data JSONB Pilihan Opsi Ganda ──
  type PilihanStruktur = { opsi: string; teks: string; poin: number }[];

  const formattedQuestions = rawQuestions.map((q) => ({
    id: q.id,
    kategori: q.kategori as "TWK" | "TIU" | "TKP",
    pertanyaan: q.pertanyaan,
    pilihan: (q.pilihan as PilihanStruktur).map((p) => ({
      opsi: p.opsi,
      teks: p.teks,
    })),
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