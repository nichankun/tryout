/**
 * app/api/riwayat/route.ts
 * * Route Handler untuk mengambil seluruh daftar riwayat pengerjaan paket tryout pengguna.
 * Dioptimalkan dengan Drizzle Relational API untuk performa query yang lebih efisien.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutHistories } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA
// ==========================================
const API_ERRORS = {
  unauthorized: "UNAUTHORIZED",
  serverError: "Gagal mengambil data riwayat ujian dari server.",
} as const;

// ==========================================
// METHOD HANDLER: GET
// ==========================================
export async function GET() {
  try {
    // 1. Autentikasi
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: API_ERRORS.unauthorized }, { status: 401 });
    }

    // 2. OPTIMASI: Relational Query (API yang lebih modern dan performant)
    // Drizzle secara otomatis menangani JOIN jika relasi sudah didefinisikan di schema.ts
    const riwayatUjian = await db.query.tryoutHistories.findMany({
      where: eq(tryoutHistories.userId, session.user.id),
      orderBy: [desc(tryoutHistories.endTime)],
      // Kita hanya mengambil kolom yang dibutuhkan untuk dashboard riwayat
      columns: {
        id: true,
        packageId: true,
        skorTwk: true,
        skorTiu: true,
        skorTkp: true,
        totalSkor: true,
        isLolos: true,
        endTime: true,
      },
      // Mengambil judul paket via relasi yang sudah kita buat sebelumnya
      with: {
        package: {
          columns: {
            title: true,
          },
        },
      },
    });

    // 3. Transformasi respons agar key "namaPaket" tetap konsisten dengan kebutuhan frontend
    const formattedData = riwayatUjian.map((item) => ({
      ...item,
      namaPaket: item.package?.title ?? "Paket Tidak Ditemukan",
      // menghapus object 'package' agar tidak redundant dalam JSON output
      package: undefined, 
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error("[API ERROR] GET /api/riwayat:", error);
    return NextResponse.json(
      { error: API_ERRORS.serverError },
      { status: 500 }
    );
  }
}