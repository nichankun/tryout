/**
 * app/api/soal/route.ts
 * 
 * Route Handler untuk mengambil data bank soal ujian simulasi CAT.
 * Proteksi keamanan menggunakan session native NextAuth v5, validasi skema integritas JSONB 
 * via Zod, serta implementasi mekanisme anti-cheat tab inspeksi network.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Menggunakan helper NextAuth v5 secara native
import { z } from "zod";
import { db } from "@/db";
import { questions, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

// Menjamin API selalu dievaluasi secara dinamis tanpa tersangkut caching runtime Next.js
export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  maxVolumeAllowed: 20,
} as const;

const API_ERRORS = {
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  missingParam: "Parameter volumeId wajib disertakan.",
  invalidParam: "volumeId tidak valid. Harus angka antara 1–20.",
  notFound: "Soal untuk volume ini belum tersedia.",
  serverError: "Gagal mengambil data soal. Coba lagi nanti.",
} as const;

// Schema Zod untuk validasi struktur array opsi pilihan ganda dari database (jsonb)
const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string(),
    poin: z.number(),
  })
);

// ==========================================
// METHOD HANDLER: GET
// ==========================================
export async function GET(request: Request) {
  // ── 1. PROTEKSI SESI OTENTIKASI NATIVE (NextAuth v5) ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: API_ERRORS.unauthorized }, { status: 401 });
  }

  const userId = session.user.id;

  // ── 2. VALIDASI PARAMETER QUERY STRING ──
  const { searchParams } = new URL(request.url);
  const rawVolumeId = searchParams.get("volumeId");

  if (!rawVolumeId) {
    return NextResponse.json({ error: API_ERRORS.missingParam }, { status: 400 });
  }

  const volumeId = parseInt(rawVolumeId, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > APP_CONFIG.maxVolumeAllowed) {
    return NextResponse.json({ error: API_ERRORS.invalidParam }, { status: 400 });
  }

  try {
    // ── 3. VERIFIKASI HAK KEPEMILIKAN AKSES PAKET (Real DB Verification) ──
    const access = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, volumeId)
      ),
    });

    if (!access) {
      return NextResponse.json({ error: API_ERRORS.forbidden }, { status: 403 });
    }

    // ── 4. AMBIL DATA BANK SOAL DARI DATABASE NEON ──
    const dataSoal = await db
      .select()
      .from(questions)
      .where(eq(questions.packageId, volumeId));

    if (dataSoal.length === 0) {
      return NextResponse.json({ error: API_ERRORS.notFound }, { status: 404 });
    }

    // ── 5. SANITASI DATA (Anti-Cheat Mechanism) ──
    const soalSanitized = dataSoal.map((soal) => {
      // Memvalidasi integritas bentuk data JSONB menggunakan skema Zod
      const daftarPilihan = PilihanSchema.parse(soal.pilihan);

      return {
        id: soal.id,
        kategori: soal.kategori, // "TWK" | "TIU" | "TKP"
        pertanyaan: soal.pertanyaan,
        // Kunci jawaban (poin) dan pembahasan sengaja dibuang di endpoint ini agar tidak bisa diintip via Network Tab
        pilihan: daftarPilihan.map((p) => ({
          opsi: p.opsi,
          teks: p.teks,
        })),
      };
    });

    return NextResponse.json({ success: true, data: soalSanitized });
  } catch (err) {
    console.error("[API ERROR] GET /api/soal:", err);
    return NextResponse.json({ error: API_ERRORS.serverError }, { status: 500 });
  }
}