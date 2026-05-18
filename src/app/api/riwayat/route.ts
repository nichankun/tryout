/**
 * app/api/riwayat/route.ts
 * 
 * Route Handler untuk mengambil seluruh daftar riwayat pengerjaan paket tryout pengguna.
 * Menggunakan integrasi session token native NextAuth v5 dan optimasi kueri Join Drizzle ORM.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Native NextAuth v5 integration
import { db } from "@/db";
import { tryoutHistories, tryoutPackages } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";

// Menjamin API selalu mengevaluasi data terbaru secara dynamic per-request user
export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
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
    // ── 1. PROTEKSI AUTENTIKASI AKSES (NextAuth v5) ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: API_ERRORS.unauthorized }, 
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ── 2. EKSEKUSI KUERI INNER JOIN RELASIONAL (Drizzle ORM) ──
    const riwayatUjian = await db
      .select({
        id: tryoutHistories.id,
        packageId: tryoutHistories.packageId,
        namaPaket: tryoutPackages.title, // Mengambil judul paket dari tabel tryout_packages
        skorTwk: tryoutHistories.skorTwk,
        skorTiu: tryoutHistories.skorTiu,
        skorTkp: tryoutHistories.skorTkp,
        totalSkor: tryoutHistories.totalSkor,
        isLolos: tryoutHistories.isLolos,
        tanggalSelesai: tryoutHistories.endTime,
      })
      .from(tryoutHistories)
      .innerJoin(
        tryoutPackages, 
        eq(tryoutHistories.packageId, tryoutPackages.id)
      )
      .where(eq(tryoutHistories.userId, userId))
      .orderBy(desc(tryoutHistories.endTime)); // Diurutkan dari penayangan ujian paling terbaru

    return NextResponse.json({
      success: true,
      data: riwayatUjian,
    });

  } catch (error) {
    console.error("[API ERROR] GET /api/riwayat:", error);
    return NextResponse.json(
      { error: API_ERRORS.serverError },
      { status: 500 }
    );
  }
}