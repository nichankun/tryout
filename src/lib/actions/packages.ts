"use server";

/**
 * lib/actions/packages.ts
 * * Server Action Produksi untuk Manajemen Paket Tryout (Admin Only).
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
  unauthorized: "Akses ditolak. Otorisasi Admin diperlukan.",
  invalidFormat: "Format data paket tidak valid.",
  internalError: "Terjadi kegagalan sistem pada server database.",
} as const;

// ==========================================
// ZOD SCHEMAS (Komposisi DRY)
// ==========================================
const BasePackageSchema = z.object({
  title: z.string().min(5, "Judul paket minimal berisi 5 karakter"),
  description: z.string().optional().nullable(), // Nullable agar aman jika dikosongkan di form
  price: z.number().int().min(0, "Harga tidak boleh negatif"),
});

// Skema untuk Create (Sama dengan Base)
const CreatePackageSchema = BasePackageSchema;

// Skema untuk Update (Menambah ID dan status aktif)
const UpdatePackageSchema = BasePackageSchema.extend({
  id: z.number().int().positive(),
  isActive: z.boolean().optional(),
});

// Ekspor Type untuk digunakan di Form Client Component Admin
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
// ACTION 1: CREATE PACKAGE
// ==========================================
export async function createPackageAction(input: CreatePackageInput) {
  try {
    await checkAdminAuth();

    const validatedData = CreatePackageSchema.safeParse(input);
    if (!validatedData.success) {
      return { 
        success: false, 
        error: ERROR_MESSAGES.invalidFormat, 
        details: validatedData.error.flatten() 
      };
    }

    await db.insert(tryoutPackages).values({
      title: validatedData.data.title,
      description: validatedData.data.description ?? null,
      price: validatedData.data.price,
      isActive: true, // Default aktif saat pertama kali dibuat
    });

    // Refresh halaman tabel paket
    revalidatePath("/admin/packages");
    
    return { success: true };
  } catch (error: any) {
    console.error("[CreatePackageAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}

// ==========================================
// ACTION 2: UPDATE PACKAGE
// ==========================================
export async function updatePackageAction(input: UpdatePackageInput) {
  try {
    await checkAdminAuth();

    const validatedData = UpdatePackageSchema.safeParse(input);
    if (!validatedData.success) {
      return { 
        success: false, 
        error: ERROR_MESSAGES.invalidFormat, 
        details: validatedData.error.flatten() 
      };
    }

    const { id, ...updatePayload } = validatedData.data;

    await db
      .update(tryoutPackages)
      .set(updatePayload)
      .where(eq(tryoutPackages.id, id));

    // Refresh cache tabel utama dan halaman detail paket spesifik
    revalidatePath("/admin/packages");
    revalidatePath(`/admin/packages/${id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("[UpdatePackageAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}

// ==========================================
// ACTION 3: DELETE PACKAGE
// ==========================================
export async function deletePackageAction(packageId: number) {
  try {
    await checkAdminAuth();

    // Drizzle akan memicu "Cascade Delete" untuk Soal & Histori secara otomatis
    // jika kita sudah mensetting `onDelete: "cascade"` di schema.ts sebelumnya.
    await db.delete(tryoutPackages).where(eq(tryoutPackages.id, packageId));

    revalidatePath("/admin/packages");
    
    return { success: true };
  } catch (error: any) {
    console.error("[DeletePackageAction Error]:", error);
    return { success: false, error: error.message === ERROR_MESSAGES.unauthorized ? error.message : ERROR_MESSAGES.internalError };
  }
}