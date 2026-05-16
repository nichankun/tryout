import { NextResponse } from "next/server";
import { db } from "@/db";
import { tryoutHistories, tryoutPackages } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // ── 1. AMBIL USER ID DARI SESSION COOKIE ──
    // Next.js 16: cookies() wajib menggunakan await
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("SESSION_COOKIE")?.value;

    // PLACEHOLDER USER ID: Di production, decode sessionToken/JWT kamu untuk mendapatkan UUID user asli
    // Pastikan nilainya sinkron dengan userId yang disimpan saat mencatat skor di API Submit
    const userId = "00000000-0000-0000-0000-000000000000"; 

    // ── 2. QUERY DENGAN JOIN UNTUK MENDAPATKAN DETAIL RIWAYAT ──
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
      .innerJoin(tryoutPackages, eq(tryoutHistories.packageId, tryoutPackages.id))
      .where(eq(tryoutHistories.userId, userId))
      .orderBy(desc(tryoutHistories.endTime)); // Mengurutkan dari ujian yang paling terbaru

    return NextResponse.json({
      success: true,
      data: riwayatUjian,
    });

  } catch (error) {
    console.error("[API_RIWAYAT_ERROR]:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data riwayat ujian dari server." },
      { status: 500 }
    );
  }
}