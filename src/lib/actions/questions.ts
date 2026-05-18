"use server";

/**
 * lib/actions/questions.ts
 * * Server Action Produksi untuk Manajemen Bank Soal.
 * Memvalidasi input form/JSON dengan struktur Drizzle JSONB yang presisi.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { questions } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

// ==========================================
// ZOD SCHEMAS UNTUK VALIDASI JSONB
// ==========================================
// Struktur wajib untuk kolom 'pilihan' (A, B, C, D, E)
const PilihanSchema = z.array(
  z.object({
    opsi: z.enum(["A", "B", "C", "D", "E"]),
    teks: z.string().min(1, "Teks pilihan tidak boleh kosong"),
    poin: z.number().int().min(0).max(5), // Skala 0-5 (TWK/TIU 0/5, TKP 1-5)
  })
).length(5, "Soal harus memiliki tepat 5 pilihan opsi (A-E)");

const CreateQuestionSchema = z.object({
  packageId: z.number().int().positive(),
  kategori: z.enum(["TWK", "TIU", "TKP"]),
  pertanyaan: z.string().min(10, "Pertanyaan terlalu singkat"),
  pilihan: PilihanSchema,
  pembahasan: z.string().min(10, "Pembahasan terlalu singkat"),
});

type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;

// ==========================================
// ACTION EXECUTION UTAMA
// ==========================================
export async function createQuestionAction(input: CreateQuestionInput) {
  try {
    // 1. Proteksi Otorisasi
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Otorisasi Admin diperlukan." };
    }

    // 2. Validasi Keamanan Payload (Zod)
    const validatedData = CreateQuestionSchema.safeParse(input);
    if (!validatedData.success) {
      return { success: false, error: "Format data soal tidak valid.", details: validatedData.error.flatten() };
    }

    // 3. Eksekusi Penyisipan ke Database (Drizzle)
    await db.insert(questions).values({
      packageId: validatedData.data.packageId,
      kategori: validatedData.data.kategori,
      pertanyaan: validatedData.data.pertanyaan,
      pilihan: validatedData.data.pilihan, // Zod menjamin struktur JSONB ini aman
      pembahasan: validatedData.data.pembahasan,
    });

    // 4. Refresh Cache Halaman Admin
    revalidatePath(`/admin/packages/${validatedData.data.packageId}`);

    return { success: true };
  } catch (error) {
    console.error("[CreateQuestionAction Error]:", error);
    return { success: false, error: "Terjadi kesalahan internal pada server database." };
  }
}

// Tambahkan import z di bagian atas jika belum ada
// Ekstensi untuk lib/actions/questions.ts

const BulkQuestionsSchema = z.array(
  z.object({
    kategori: z.enum(["TWK", "TIU", "TKP"]),
    pertanyaan: z.string().min(10),
    pembahasan: z.string().min(10),
    pilihan: z.array(
      z.object({
        opsi: z.enum(["A", "B", "C", "D", "E"]),
        teks: z.string().min(1),
        poin: z.number().int().min(0).max(5),
      })
    ).length(5),
  })
);

export async function importBulkQuestionsAction(packageId: number, rawQuestions: unknown) {
  try {
    // 1. Gembok Otorisasi Akses Admin
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Otorisasi Admin diperlukan." };
    }

    // 2. Validasi Seluruh Array Soal dengan Zod
    const validatedData = BulkQuestionsSchema.safeParse(rawQuestions);
    if (!validatedData.success) {
      return { 
        success: false, 
        error: "Struktur data di dalam file JSON tidak valid atau tidak sesuai standar.",
        details: validatedData.error.flatten() 
      };
    }

    const totalIncoming = validatedData.data.length;
    if (totalIncoming === 0) {
      return { success: false, error: "File JSON kosong, tidak ada soal untuk di-import." };
    }

    // 3. Transformasi Data dengan Memetakan packageId Tujuan
    const insertPayload = validatedData.data.map((q) => ({
      packageId,
      kategori: q.kategori,
      pertanyaan: q.pertanyaan,
      pilihan: q.pilihan,
      pembahasan: q.pembahasan,
    }));

    // 4. Eksekusi Kueri Massal (Bulk Insert) via Drizzle
    await db.insert(questions).values(insertPayload);

    // 5. Bersihkan & Segarkan Cache Halaman Detail Paket
    revalidatePath(`/admin/packages/${packageId}`);

    return { success: true, totalImported: totalIncoming };
  } catch (error) {
    console.error("[ImportBulkQuestionsAction Error]:", error);
    return { success: false, error: "Terjadi kegagalan sistem sewaktu memproses simpan massal ke database." };
  }
}

// Ekstensi untuk lib/actions/questions.ts
// Pastikan 'eq' sudah di-import dari "drizzle-orm" di bagian atas file

export async function deleteQuestionAction(questionId: number, packageId: number) {
  try {
    // 1. Gembok Keamanan Otorisasi Admin
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Otorisasi Admin diperlukan." };
    }

    // 2. Eksekusi Hapus Data di Postgres via Drizzle
    await db.delete(questions).where(eq(questions.id, questionId));

    // 3. Intimidasi Cache Next.js agar Halaman Detail Paket Langsung Refresh Data
    revalidatePath(`/admin/packages/${packageId}`);

    return { success: true };
  } catch (error) {
    console.error("[DeleteQuestionAction Error]:", error);
    return { success: false, error: "Terjadi kesalahan internal saat menghapus soal." };
  }
}

// Ekstensi untuk lib/actions/questions.ts

// Schema validasi khusus update (memerlukan ID soal yang valid)
const UpdateQuestionSchema = z.object({
  id: z.number().int().positive(),
  packageId: z.number().int().positive(),
  kategori: z.enum(["TWK", "TIU", "TKP"]),
  pertanyaan: z.string().min(10),
  pilihan: PilihanSchema, // Menggunakan PilihanSchema array (A-E) yang sudah dibuat sebelumnya
  pembahasan: z.string().min(10),
});

type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

export async function updateQuestionAction(input: UpdateQuestionInput) {
  try {
    // 1. Gembok Keamanan Otorisasi Admin
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Otorisasi Admin diperlukan." };
    }

    // 2. Validasi Struktur Payload dengan Zod
    const validatedData = UpdateQuestionSchema.safeParse(input);
    if (!validatedData.success) {
      return { success: false, error: "Format data pembaruan soal tidak valid.", details: validatedData.error.flatten() };
    }

    const { id, packageId, ...updatePayload } = validatedData.data;

    // 3. Eksekusi Kueri Pembaruan ke Postgres via Drizzle
    await db
      .update(questions)
      .set(updatePayload)
      .where(eq(questions.id, id));

    // 4. Bersihkan Cache Halaman Terkait
    revalidatePath(`/admin/packages/${packageId}`);

    return { success: true };
  } catch (error) {
    console.error("[UpdateQuestionAction Error]:", error);
    return { success: false, error: "Terjadi kegagalan sistem sewaktu memperbarui data soal." };
  }
}