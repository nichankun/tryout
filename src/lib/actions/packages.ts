"use server";

/**
 * lib/actions/packages.ts
 *
 * Server Action Produksi untuk Manajemen Paket Tryout (Admin Only).
 * Dioptimalkan dengan Zod Schema Composition, Centralized Auth,
 * dan penambahan fungsi CRUD lengkap untuk mendukung integrasi Panel Admin.
 */

import { requireAdminAccess } from "@/lib/authz";
import { db } from "@/db";
import { adminAuditLogs, tryoutPackages } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createAdminAuditEntry } from "@/lib/security/admin-audit";

// ==========================================
// KONSTANTA & KONFIGURASI UMUM
// ==========================================
const ERROR_MESSAGES = {
  unauthorized:  "Akses ditolak. Silakan login kembali.",
  forbidden:     "Akses ditolak. Otorisasi Admin diperlukan.",
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
// ==========================================
// HELPER: HANDLE ERROR TERPUSAT
// ==========================================
function handleActionError(error: unknown) {
  console.error("[PackageAction Error]:", error);
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
// ACTION 1: CREATE PACKAGE
// ==========================================
export async function createPackageAction(input: CreatePackageInput) {
  try {
    const actor = await requireAdminAccess();

    const parsed = CreatePackageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error:   ERROR_MESSAGES.invalidFormat,
        details: parsed.error.flatten(),
      };
    }

    const packageId = await db.transaction(async (tx) => {
      const [createdPackage] = await tx.insert(tryoutPackages).values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        isActive: true,
      }).returning({ id: tryoutPackages.id });

      await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
        action: "package.created",
        targetType: "package",
        targetId: String(createdPackage.id),
        metadata: { title: parsed.data.title, price: parsed.data.price },
      }));

      return createdPackage.id;
    });

    revalidatePath("/admin/packages");
    return { success: true as const, packageId };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}

// ==========================================
// ACTION 2: UPDATE PACKAGE
// ==========================================
export async function updatePackageAction(input: UpdatePackageInput) {
  try {
    const actor = await requireAdminAccess();

    const parsed = UpdatePackageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error:   ERROR_MESSAGES.invalidFormat,
        details: parsed.error.flatten(),
      };
    }

    const { id, ...updatePayload } = parsed.data;

    await db.transaction(async (tx) => {
      const [updatedPackage] = await tx
        .update(tryoutPackages)
        .set(updatePayload)
        .where(eq(tryoutPackages.id, id))
        .returning({ id: tryoutPackages.id });

      if (updatedPackage) {
        await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
          action: "package.updated",
          targetType: "package",
          targetId: String(id),
          metadata: {
            title: parsed.data.title,
            price: parsed.data.price,
            isActive: parsed.data.isActive ?? null,
          },
        }));
      }
    });

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
    const actor = await requireAdminAccess();

    // Cascade delete otomatis untuk Soal & Histori
    // karena onDelete: "cascade" sudah diset di schema.ts
    await db.transaction(async (tx) => {
      const [deletedPackage] = await tx
        .delete(tryoutPackages)
        .where(eq(tryoutPackages.id, packageId))
        .returning({ id: tryoutPackages.id, title: tryoutPackages.title });

      if (deletedPackage) {
        await tx.insert(adminAuditLogs).values(createAdminAuditEntry(actor, {
          action: "package.deleted",
          targetType: "package",
          targetId: String(packageId),
          metadata: { title: deletedPackage.title },
        }));
      }
    });

    revalidatePath("/admin/packages");
    return { success: true as const };
  } catch (error: unknown) {
    return handleActionError(error);
  }
}
