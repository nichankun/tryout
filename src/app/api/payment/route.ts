/**
 * app/api/soal/route.ts — FIXED
 *
 * [1] "SESSION_COOKIE" → "asn_session" — konsisten dengan proxy.ts & auth.ts
 * [2] export const dynamic = "force-dynamic" — cegah caching tak terduga
 * [3] pilihan divalidasi dengan Zod — tidak pakai as cast yang tidak aman
 *
 * 📦 INSTALL: npm install zod
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { questions, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

// ✅ [FIX 2] Force dynamic — data soal bersifat per-user, tidak boleh di-cache
export const dynamic = "force-dynamic";

// ✅ [FIX 3] Schema Zod untuk validasi shape pilihan dari DB
const PilihanSchema = z.array(
  z.object({
    opsi: z.string(),
    teks: z.string(),
    poin: z.number(),
  })
);

export async function GET(request: Request) {
  // ── 1. AUTH CHECK ──────────────────────────────────────────────────────
  const cookieStore = await cookies();
  // ✅ [FIX 1] Nama cookie konsisten dengan proxy.ts dan lib/actions/auth.ts
  const session = cookieStore.get("asn_session");
  if (!session?.value) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // ── 2. VALIDASI volumeId ───────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("volumeId");

  if (!raw) {
    return NextResponse.json(
      { error: "Parameter volumeId wajib disertakan." },
      { status: 400 }
    );
  }

  const volumeId = parseInt(raw, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > 20) {
    return NextResponse.json(
      { error: "volumeId tidak valid. Harus angka antara 1–20." },
      { status: 400 }
    );
  }

  try {
    // ── 3. CEK KEPEMILIKAN VOLUME ──────────────────────────────────────────
    // Production: decode session.value untuk dapat userId
    // const userId = await getUserIdFromSession(session.value);
    const userId = "00000000-0000-0000-0000-000000000000"; // placeholder

    const access = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, volumeId)
      ),
    });

    if (!access) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ── 4. AMBIL SOAL ──────────────────────────────────────────────────────
    const dataSoal = await db
      .select()
      .from(questions)
      .where(eq(questions.packageId, volumeId));

    if (dataSoal.length === 0) {
      return NextResponse.json(
        { error: "Soal untuk volume ini belum tersedia." },
        { status: 404 }
      );
    }

    // ── 5. SANITASI — ANTI-CHEAT ───────────────────────────────────────────
    const soalSanitized = dataSoal.map((soal) => {
      // ✅ [FIX 3] Zod parse — throw jika shape DB tidak sesuai
      const daftarPilihan = PilihanSchema.parse(soal.pilihan);

      return {
        id: soal.id,
        kategori: soal.kategori, // "TWK" | "TIU" | "TKP"
        pertanyaan: soal.pertanyaan,
        // pembahasan & poin sengaja tidak diikutkan — anti-cheat
        pilihan: daftarPilihan.map((p) => ({
          opsi: p.opsi,
          teks: p.teks,
        })),
      };
    });

    return NextResponse.json({ success: true, data: soalSanitized });
  } catch (err) {
    // Zod parse error juga tertangkap di sini
    console.error("[GET /api/soal]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data soal. Coba lagi nanti." },
      { status: 500 }
    );
  }
}