"use server";

/**
 * lib/actions/questions.ts
 * * Server Action Produksi untuk Manajemen Bank Soal (Admin Only).
 * Dioptimalkan dengan Zod Schema Composition (DRY), Centralized Auth,
 * dan Native Bulk Insert Drizzle ORM.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { questions } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

// ==========================================
// KONSTANTA & KONFIGURASI UMUM
// ==========================================
const ADMIN_ROLE = "ADMIN" as const;
const KATEGORI_SOAL = ["TWK", "TIU", "TKP"] as const;
const OPSI_PILIHAN = ["A", "B", "C", "D", "E"] as const;

const ERROR_MESSAGES = {
  unauthorized: "Akses ditolak. Otorisasi Admin diperlukan.",
  invalidFormat: "Format data soal tidak valid.",
  internalError: "Terjadi kegagalan sistem pada server database.",
  emptyImport: "File JSON kosong, tidak ada soal untuk di-import.",
} as const;

// ==========================================
// ZOD SCHEMAS (Komposisi DRY)
// ==========================================
// 1. Skema inti untuk Opsi Pilihan (A-E)
const PilihanSchema = z.array(
  z.object({
    opsi: z.enum(OPSI_PILIHAN),
    teks: z.string().min(1, "Teks pilihan tidak boleh kosong"),
    poin: z.number().int().min(0).max(5), // Skala 0-5
  })
).length(5, "Soal harus memiliki tepat 5 pilihan opsi (A-E)");

// 2. Skema dasar yang sama untuk Create, Update, maupun Bulk
const BaseQuestionSchema = z.object({
  kategori: z.enum(KATEGORI_SOAL),
  pertanyaan: z.string().min(10, "Pertanyaan terlalu singkat (minimal 10 karakter)"),
  pilihan: PilihanSchema,
  pembahasan: z.string().min(10, "Pembahasan terlalu singkat (minimal 10 karakter)"),
});

// 3. Turunan dari skema dasar untuk kebutuhan spesifik
const CreateQuestionSchema = BaseQuestionSchema.extend({
  packageId: z.number().int().positive(),
});

const UpdateQuestionSchema = BaseQuestionSchema.extend({
  id: z.number().int().positive(),
  packageId: z.number().int().positive(),
});

const BulkQuestionsSchema = z.array(BaseQuestionSchema);

// Ekspor Type Inference untuk digunakan di komponen form Admin
export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

// ==========================================
// HELPER: VALIDASI OTORISASI TERPUSAT
// ==========================================
async function checkAdminAuth() {
  const session = await auth();
  if (session?.user?.role !== ADMIN_ROLE) {
    throw new Error(ERROR_MESSAGES.unauthorized);
  }
}

// ==========================================
// ACTION 1: CREATE SINGLE QUESTION
// ==========================================
export async function createQuestionAction(input: CreateQuestionInput) {
  try {
    await checkAdminAuth();

    const validatedData = CreateQuestionSchema.safeParse(input);
    if (!validatedData.success) {
      return { success: false, error: ERROR_MESSAGES.invalidFormat, details: validatedData.error.flatten() };
    }

    // Drizzle insert tunggal
    await db.insert(questions).values(validatedData.data);

    revalidatePath(`/admin/packages/${validatedData.data.packageId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[CreateQuestionAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}

// ==========================================
// ACTION 2: BULK IMPORT QUESTIONS (EXCEL/JSON)
// ==========================================
export async function importBulkQuestionsAction(packageId: number, rawQuestions: unknown) {
  try {
    await checkAdminAuth();

    const validatedData = BulkQuestionsSchema.safeParse(rawQuestions);
    if (!validatedData.success) {
      return { 
        success: false, 
        error: ERROR_MESSAGES.invalidFormat,
        details: validatedData.error.flatten() 
      };
    }

    const totalIncoming = validatedData.data.length;
    if (totalIncoming === 0) {
      return { success: false, error: ERROR_MESSAGES.emptyImport };
    }

    // Injeksi packageId ke setiap soal yang diimport
    const insertPayload = validatedData.data.map((q) => ({
      packageId,
      ...q, // Spread operator karena skema base-nya sudah identik
    }));

    // Eksekusi Massal: Drizzle menerjemahkan ini menjadi single query INSERT yang super cepat
    await db.insert(questions).values(insertPayload);

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true, totalImported: totalIncoming };
  } catch (error: any) {
    console.error("[ImportBulkQuestionsAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}

// ==========================================
// ACTION 3: UPDATE QUESTION
// ==========================================
export async function updateQuestionAction(input: UpdateQuestionInput) {
  try {
    await checkAdminAuth();

    const validatedData = UpdateQuestionSchema.safeParse(input);
    if (!validatedData.success) {
      return { success: false, error: ERROR_MESSAGES.invalidFormat, details: validatedData.error.flatten() };
    }

    // Ekstrak ID agar tidak ikut masuk ke dalam payload UPDATE
    const { id, packageId, ...updatePayload } = validatedData.data;

    await db
      .update(questions)
      .set(updatePayload)
      .where(eq(questions.id, id));

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[UpdateQuestionAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}

// ==========================================
// ACTION 4: DELETE QUESTION
// ==========================================
export async function deleteQuestionAction(questionId: number, packageId: number) {
  try {
    await checkAdminAuth();

    await db.delete(questions).where(eq(questions.id, questionId));

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[DeleteQuestionAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}