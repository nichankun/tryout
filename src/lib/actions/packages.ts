"use server";

/**
 * lib/actions/packages.ts
 * * Server Action untuk Manajemen Paket Tryout.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutPackages } from "@/db/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreatePackageSchema = z.object({
  title: z.string().min(5, "Judul paket minimal berisi 5 karakter"),
  description: z.string().optional(),
  price: z.number().int().min(0, "Harga tidak boleh negatif"),
});

export async function createPackageAction(input: z.infer<typeof CreatePackageSchema>) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Akses ditolak. Otorisasi Admin diperlukan." };
    }

    const validatedData = CreatePackageSchema.safeParse(input);
    if (!validatedData.success) {
      return { success: false, error: "Format data paket tidak valid." };
    }

    await db.insert(tryoutPackages).values({
      title: validatedData.data.title,
      description: validatedData.data.description ?? null,
      price: validatedData.data.price,
      isActive: true,
    });

    revalidatePath("/admin/packages");

    return { success: true };
  } catch (error) {
    console.error("[CreatePackageAction Error]:", error);
    return { success: false, error: "Terjadi kesalahan internal pada server database." };
  }
}