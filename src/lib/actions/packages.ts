"use server";

/**
 * lib/actions/packages.ts
 *
 * Server Action Produksi untuk Manajemen Paket Tryout (Admin Only).
 * Dioptimalkan dengan Zod Schema Composition, Centralized Auth,
 * dan penambahan fungsi CRUD lengkap untuk mendukung integrasi Panel Admin.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutPackages } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

// ==========================================
// KONSTANTA & KONFIGURASI UMUM
// ==========================================
const ADMIN_ROLE = "ADMIN" as const;

const ERROR_MESSAGES = {
  unauthorized:  "Akses ditolak. Otorisasi Admin diperlukan.",
  invalidFormat: "Format data paket tidak valid.",
  internalError: "Terjadi kegagalan sistem pada server database.",
} as const;

// ==========================================
// ZOD SCHEMAS (Komposisi DRY)
// ==========================================
const BasePackageSchema = z.object({
  title:       z.string().min(5, "Judul paket minimal berisi 5 karakter"),
  description: z.string().optional().nullable(),
  price:       z.number().int().min(0, "Harga tidak boleh negatif"),
});

const CreatePackageSchema = BasePackageSchema;

const UpdatePackageSchema = BasePackageSchema.extend({
  id:       z.number().int().positive(),
  isActive: z.boolean().optional(),
});

export type CreatePackageInput = z.infer<typeof CreatePackageSchema>;
export type UpdatePackageInput = z.infer<typeof UpdatePackageSchema>;

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
  console.error("[PackageAction Error]:", error);
  const msg = error instanceof Error ? error.message : "";
  return {
    success: false as const,
    error: msg === ERROR_MESSAGES.unauthorized
      ? msg
      : ERROR_MESSAGES.internalError,
  };
}

// ==========================================
// ACTION 1: CREATE PACKAGE
// ==========================================
export async function createPackageAction(input: CreatePackageInput) {
  try {
    await checkAdminAuth();

    const parsed = CreatePackageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error:   ERROR_MESSAGES.invalidFormat,
        details: parsed.error.flatten(),
      };
    }

    await db.insert(tryoutPackages).values({
      title:       parsed.data.title,
      description: parsed.data.description ?? null,
      price:       parsed.data.price,
      isActive:    true, // Default aktif saat pertama kali dibuat
    });

    revalidatePath("/admin/packages");
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

// ==========================================
// ACTION 2: UPDATE PACKAGE
// ==========================================
export async function updatePackageAction(input: UpdatePackageInput) {
  try {
    await checkAdminAuth();

    const parsed = UpdatePackageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error:   ERROR_MESSAGES.invalidFormat,
        details: parsed.error.flatten(),
      };
    }

    const { id, ...updatePayload } = parsed.data;

    await db
      .update(tryoutPackages)
      .set(updatePayload)
      .where(eq(tryoutPackages.id, id));

    revalidatePath("/admin/packages");
    revalidatePath(`/admin/packages/${id}`);
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

// ==========================================
// ACTION 3: DELETE PACKAGE
// ==========================================
export async function deletePackageAction(packageId: number) {
  try {
    await checkAdminAuth();

    // Cascade delete otomatis untuk Soal & Histori
    // karena onDelete: "cascade" sudah diset di schema.ts
    await db.delete(tryoutPackages).where(eq(tryoutPackages.id, packageId));

    revalidatePath("/admin/packages");
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}