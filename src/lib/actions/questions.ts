"use server";

/**
 * lib/actions/questions.ts
 *
 * Server Action Produksi untuk Manajemen Bank Soal (Admin Only).
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
const ADMIN_ROLE     = "ADMIN" as const;
const KATEGORI_SOAL  = ["TWK", "TIU", "TKP"] as const;
const OPSI_PILIHAN   = ["A", "B", "C", "D", "E"] as const;
const FIGURAL_TIPE   = [
  "deret_rotasi", "matriks", "pencerminan",
  "analogi_gambar", "analogi_matriks", "ketidaksamaan",
  "deret_bangun", "tumpukan_balok",
] as const;

const ERROR_MESSAGES = {
  unauthorized:  "Akses ditolak. Otorisasi Admin diperlukan.",
  invalidFormat: "Format data soal tidak valid.",
  internalError: "Terjadi kegagalan sistem pada server database.",
  emptyImport:   "File JSON kosong, tidak ada soal untuk di-import.",
} as const;

// ==========================================
// ZOD SCHEMAS (Komposisi DRY)
// ==========================================

// 1. Skema opsi pilihan
const PilihanSchema = z.array(
  z.object({
    opsi:         z.enum(OPSI_PILIHAN),
    // FIX: tambah min(1) agar teks opsi tidak boleh kosong
    teks:         z.string().min(1, "Teks opsi tidak boleh kosong"),
    poin:         z.number().int().min(0).max(5),
    // FIX: pakai null (bukan undefined) agar konsisten dengan kolom JSONB DB
    figuralAngle: z.number().nullable().optional(),
  })
).length(5, "Soal harus memiliki tepat 5 pilihan opsi (A-E)");

// 2. Skema dasar (dipakai oleh Create, Update, dan Bulk)
const BaseQuestionSchema = z.object({
  kategori:    z.enum(KATEGORI_SOAL),
  pertanyaan:  z.string().min(10, "Pertanyaan terlalu singkat"),
  pilihan:     PilihanSchema,
  pembahasan:  z.string().min(10, "Pembahasan terlalu singkat"),

  // preprocess: ubah null → false agar default bisa bekerja
  isFigural: z.preprocess(
    (val) => (val === null ? false : val),
    z.boolean().optional().default(false)
  ),

  // preprocess: ubah null → undefined agar .optional() bekerja
  // FIX: gunakan FIGURAL_TIPE dari konstanta agar tidak duplikat string literal
  figuralConfig: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.object({
      tipe:      z.enum(FIGURAL_TIPE),
      deretSoal: z.array(z.union([z.string(), z.number()])),
    }).optional()
  ),
});

// 3. Turunan untuk kebutuhan spesifik
const CreateQuestionSchema = BaseQuestionSchema.extend({
  packageId: z.number().int().positive(),
});

const UpdateQuestionSchema = BaseQuestionSchema.extend({
  id:        z.number().int().positive(),
  packageId: z.number().int().positive(),
});

const BulkQuestionsSchema = z.array(BaseQuestionSchema);

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

// ==========================================
// HELPER: NORMALISASI PAYLOAD (DRY)
// ==========================================
/**
 * Normalisasi data soal sebelum dikirim ke DB.
 *
 * Mengapa tidak pakai `?? undefined` di sini?
 * Drizzle ORM menerima `null` untuk kolom nullable JSONB.
 * Kita biarkan `null` masuk agar DB bisa membedakan
 * "belum pernah diisi" (NULL) vs "array kosong" ([]).
 * Jika kolom DB Anda NOT NULL, ganti `?? null` ke `?? defaultValue`.
 */
type BaseValidated = z.infer<typeof BaseQuestionSchema>;

function normalizeQuestionPayload(q: BaseValidated) {
  return {
    kategori:      q.kategori,
    pertanyaan:    q.pertanyaan,
    pembahasan:    q.pembahasan,
    isFigural:     q.isFigural ?? false,
    // null jika tidak ada konfigurasi figural — konsisten dengan kolom DB nullable
    figuralConfig: q.figuralConfig ?? null,
    pilihan: q.pilihan.map((p) => ({
      opsi:  p.opsi,
      teks:  p.teks,
      poin:  p.poin,
      // null jika bukan opsi figural — konsisten dengan interface QuestionChoice
      figuralAngle: p.figuralAngle ?? null,
    })),
  };
}

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
// HELPER: HANDLE ERROR TERPUSAT
// ==========================================
function handleActionError(error: unknown) {
  console.error("[QuestionAction Error]:", error);
  const msg = error instanceof Error ? error.message : "";
  return {
    success: false as const,
    error: msg === ERROR_MESSAGES.unauthorized
      ? msg
      : ERROR_MESSAGES.internalError,
  };
}

// ==========================================
// ACTION 1: CREATE SINGLE QUESTION
// ==========================================
export async function createQuestionAction(input: CreateQuestionInput) {
  try {
    await checkAdminAuth();

    const parsed = CreateQuestionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: ERROR_MESSAGES.invalidFormat, details: parsed.error.flatten() };
    }

    const { packageId, ...baseData } = parsed.data;
    await db.insert(questions).values({
      packageId,
      ...normalizeQuestionPayload(baseData),
    });

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

// ==========================================
// ACTION 2: BULK IMPORT QUESTIONS (JSON)
// ==========================================
export async function importBulkQuestionsAction(
  packageId: number,
  rawQuestions: unknown
) {
  try {
    await checkAdminAuth();

    const parsed = BulkQuestionsSchema.safeParse(rawQuestions);
    if (!parsed.success) {
      console.error("Zod Validation Failed:", JSON.stringify(parsed.error.flatten(), null, 2));
      return {
        success: false as const,
        error:   ERROR_MESSAGES.invalidFormat,
        details: parsed.error.flatten(),
      };
    }

    if (parsed.data.length === 0) {
      return { success: false as const, error: ERROR_MESSAGES.emptyImport };
    }

    // FIX: gunakan normalizeQuestionPayload agar tidak duplikasi mapper
    const insertPayload = parsed.data.map((q) => ({
      packageId,
      ...normalizeQuestionPayload(q),
    }));

    await db.insert(questions).values(insertPayload);

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true as const, totalImported: parsed.data.length };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

// ==========================================
// ACTION 3: UPDATE QUESTION
// ==========================================
export async function updateQuestionAction(input: UpdateQuestionInput) {
  try {
    await checkAdminAuth();

    const parsed = UpdateQuestionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: ERROR_MESSAGES.invalidFormat, details: parsed.error.flatten() };
    }

    const { id, packageId, ...baseData } = parsed.data;

    await db
      .update(questions)
      .set(normalizeQuestionPayload(baseData))
      .where(eq(questions.id, id));

    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
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
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}