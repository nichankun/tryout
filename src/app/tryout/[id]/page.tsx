/**
 * app/tryout/[id]/page.tsx
 * * Server Component Utama Ruang Ujian CAT.
 * Dioptimalkan dengan Concurrent Fetching (Promise.all) dan Partial Query.
 * Type-Safe 100% dari Drizzle schema, tanpa manual casting.
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

// Menonaktifkan caching statis karena data bergantung pada sesi user (dinamis)
export const dynamic = "force-dynamic";

export default async function TryoutPage({ params }: TryoutPageProps) {
  // ── 1. PARALLEL RESOLUTION (Sesi & Params) ──
  const [resolvedParams, session] = await Promise.all([params, auth()]);

  const volumeId = parseInt(resolvedParams.id, 10);
  if (isNaN(volumeId)) notFound();

  // Redirect aman tanpa membocorkan rute internal jika belum login
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/tryout/${volumeId}`);
  }

  // ── 2. VALIDASI KEPEMILIKAN AKSES (Query Ringan) ──
  const accessRecord = await db.query.userAccess.findFirst({
    where: and(
      eq(userAccess.userId, session.user.id),
      eq(userAccess.packageId, volumeId)
    ),
    columns: { id: true }, // Hanya ambil ID, sangat menghemat memori
  });

  if (!accessRecord) {
    redirect(`/checkout/${volumeId}`);
  }

  // ── 3. PARALLEL FETCHING (Paket & Soal) ──
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
        pilihan: true, // Type inferred langsung sebagai QuestionChoice[] dari schema.ts
      },
      orderBy: [asc(questions.id)],
    }),
  ]);

  // Validasi ketersediaan data
  if (!packageData || rawQuestions.length === 0) {
    notFound();
  }

  // ── 4. PEMETAAN AMAN & SANITASI PAYLOAD (BEBAS ERROR TS) ──
  // STRATEGI KEAMANAN: Membuang properti "poin" dari JSONB
  const formattedQuestions = rawQuestions.map((q) => ({
    id: q.id,
    kategori: q.kategori as "TWK" | "TIU" | "TKP",
    pertanyaan: q.pertanyaan,
    // TypeScript sekarang otomatis tahu 'p' memiliki opsi, teks, dan poin (tanpa perlu as PilihanStruktur)
    pilihan: q.pilihan.map((p) => ({
      opsi: p.opsi,
      teks: p.teks,
      // poin sengaja di-drop agar tidak bocor ke client
    })),
  }));

  // ── 5. RENDER CLIENT COMPONENT ──
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