/**
 * app/admin/packages/[id]/edit/[questionId]/page.tsx
 */

import { db } from "@/db";
import { questions } from "@/db/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EditQuestionFormClient from "./edit-form-client";

interface EditQuestionPageProps {
  params: Promise<{ id: string; questionId: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const resolvedParams = await params;
  const packageId = parseInt(resolvedParams.id, 10);
  const questionId = parseInt(resolvedParams.questionId, 10);

  // Ambil data soal yang spesifik dari database
  const [questionData] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  // Jika soal tidak ditemukan, lempar langsung ke halaman 404
  if (!questionData || questionData.packageId !== packageId) {
    notFound();
  }

  // Definisikan tipe aman untuk struktur JSONB pilihan jawaban
  type PilihanStruktur = { opsi: "A" | "B" | "C" | "D" | "E"; teks: string; poin: number }[];

  // Lempar data lama ke sisi Client Form Component sebagai initial values
  const initialData = {
    id: questionData.id,
    packageId: questionData.packageId,
    kategori: questionData.kategori as "TWK" | "TIU" | "TKP",
    pertanyaan: questionData.pertanyaan,
    pembahasan: questionData.pembahasan,
    pilihan: questionData.pilihan as PilihanStruktur,
  };

  return <EditQuestionFormClient initialData={initialData} />;
}