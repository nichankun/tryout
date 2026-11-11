"use server";

/**
 * lib/actions/questions.ts
 *
 * Server Action Produksi untuk Manajemen Bank Soal (Admin Only).
 * Dioptimalkan dengan Zod Schema Composition (DRY), Centralized Auth,
 * dan Native Bulk Insert Drizzle ORM.
 */

import { requireAdminAccess } from "@/lib/authz";
import { db } from "@/db";
import { adminAuditLogs, questions } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAdminAuditEntry } from "@/lib/security/admin-audit";

// ==========================================
// KONSTANTA & KONFIGURASI UMUM
// ==========================================
const KATEGORI_SOAL  = ["TWK", "TIU", "TKP"] as const;
const OPSI_PILIHAN   = ["A", "B", "C", "D", "E"] as const;

const ERROR_MESSAGES = {
  unauthorized:  "Akses ditolak. Silakan login kembali.",
  forbidden:     "Akses ditolak. Otorisasi Admin diperlukan.",
  invalidFormat: "Format data soal tidak valid.",
  internalError: "Terjadi kegagalan sistem pada server database.",
  emptyImport:   "File JSON kosong, tidak ada soal untuk di-import.",
  invalidImage:  "Gambar harus diunggah ke paket yang sama dengan soal.",
} as const;

// ==========================================
// ZOD SCHEMAS (Komposisi DRY)
// ==========================================
const ImageUrlSchema = z
  .string()
  .max(256)
  .regex(/^\/api\/question-images\/\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i)
  .nullable()
  .optional();

// 1. Skema opsi pilihan
const PilihanSchema = z.array(
  z.object({
    opsi:     z.enum(OPSI_PILIHAN),
    teks:     z.string().trim().max(500).optional().default(""),
    poin:     z.number().int().min(0).max(5),
    imageUrl: ImageUrlSchema,
    imageAlt: z.string().trim().max(300).nullable().optional(),
  })
).length(5, "Soal harus memiliki tepat 5 pilihan opsi (A-E)").superRefine((choices, context) => {
  choices.forEach((choice, index) => {
    if (!choice.teks?.trim() && !choice.imageUrl) {
      context.addIssue({
        code: "custom",
        path: [index, "teks"],
        message: "Isi teks atau unggah gambar untuk pilihan ini.",
      });
    }
  });
});

// 2. Skema dasar (dipakai oleh Create, Update, dan Bulk)
const BaseQuestionSchema = z.object({
  kategori:    z.enum(KATEGORI_SOAL),
  pertanyaan:  z.string().min(10, "Pertanyaan terlalu singkat"),
  imageUrl:    ImageUrlSchema,
  imageAlt:    z.string().trim().max(300).nullable().optional(),
  pilihan:     PilihanSchema,
  pembahasan:  z.string().min(10, "Pembahasan terlalu singkat"),
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

function imagesBelongToPackage(packageId: number, question: BaseValidated) {
  const packagePrefix = `/api/question-images/${packageId}/`;
  return [question.imageUrl, ...question.pilihan.map((choice) => choice.imageUrl)]
    .every((imageUrl) => !imageUrl || imageUrl.startsWith(packagePrefix));
}

function normalizeQuestionPayload(q: BaseValidated) {
  return {
    kategori:      q.kategori,
    pertanyaan:    q.pertanyaan,
    imageUrl:      q.imageUrl ?? null,
    imageAlt:      q.imageAlt ?? null,
    pembahasan:    q.pembahasan,
    isFigural:     false,
    figuralConfig: null,
    pilihan: q.pilihan.map((p) => ({
      opsi:     p.opsi,
      teks:     p.teks ?? "",
      poin:     p.poin,
      imageUrl: p.imageUrl ?? null,
      imageAlt: p.imageAlt ?? null,
    })),
  };
}

// ==========================================
// HELPER: VALIDASI OTORISASI TERPUSAT
// ==========================================
// ==========================================
// HELPER: HANDLE ERROR TERPUSAT
// ==========================================
function handleActionError(error: unknown) {
  console.error("[QuestionAction Error]:", error);
  const msg = error instanceof Error ? error.message : "";
  return {
    success: false as const,
    error: msg === "UNAUTHORIZED"
      ? ERROR_MESSAGES.unauthorized
      : msg === "FORBIDDEN"
        ? ERROR_MESSAGES.forbidden
        : ERROR_MESSAGES.internalError,
  };
}

// ==========================================
// ACTION 1: CREATE SINGLE QUESTION
// ==========================================
export async function createQuestionAction(input: CreateQuestionInput) {
  try {
    const actor = await requireAdminAccess();

    const parsed = CreateQuestionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: ERROR_MESSAGES.invalidFormat, details: parsed.error.flatten() };
    }

    if (!imagesBelongToPackage(parsed.data.packageId, parsed.data)) {
      return { success: false as const, error: ERROR_MESSAGES.invalidImage };
    }

    const { packageId, ...baseData } = parsed.data;
    await db.transaction(async (tx) => {
      const [createdQuestion] = await tx.insert(questions).values({
        packageId,
        ...normalizeQuestionPayload(baseData),
      }).returning({ id: questions.id });

      await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
        action: "question.created",
        targetType: "question",
        targetId: String(createdQuestion.id),
        metadata: { packageId, category: parsed.data.kategori },
      }));
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
    const actor = await requireAdminAccess();

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

    if (parsed.data.some((question) => !imagesBelongToPackage(packageId, question))) {
      return { success: false as const, error: ERROR_MESSAGES.invalidImage };
    }

    const insertPayload = parsed.data.map((q) => ({
      packageId,
      ...normalizeQuestionPayload(q),
    }));

    await db.transaction(async (tx) => {
      await tx.insert(questions).values(insertPayload);
      await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
        action: "question.imported",
        targetType: "package",
        targetId: String(packageId),
        metadata: { packageId, count: parsed.data.length },
      }));
    });

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
    const actor = await requireAdminAccess();

    const parsed = UpdateQuestionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: ERROR_MESSAGES.invalidFormat, details: parsed.error.flatten() };
    }

    if (!imagesBelongToPackage(parsed.data.packageId, parsed.data)) {
      return { success: false as const, error: ERROR_MESSAGES.invalidImage };
    }

    const { id, packageId, ...baseData } = parsed.data;

    await db.transaction(async (tx) => {
      const [updatedQuestion] = await tx
        .update(questions)
        .set(normalizeQuestionPayload(baseData))
        .where(eq(questions.id, id))
        .returning({ id: questions.id });

      if (updatedQuestion) {
        await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
          action: "question.updated",
          targetType: "question",
          targetId: String(id),
          metadata: { packageId, category: parsed.data.kategori },
        }));
      }
    });

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
    const actor = await requireAdminAccess();
    await db.transaction(async (tx) => {
      const [deletedQuestion] = await tx
        .delete(questions)
        .where(eq(questions.id, questionId))
        .returning({ id: questions.id });

      if (deletedQuestion) {
        await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
          action: "question.deleted",
          targetType: "question",
          targetId: String(questionId),
          metadata: { packageId },
        }));
      }
    });
    revalidatePath(`/admin/packages/${packageId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
