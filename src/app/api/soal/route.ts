import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { questions, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  // ── 1. AUTH CHECK ──────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const session = cookieStore.get("SESSION_COOKIE");
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
    // ── 3. CEK KEPEMILIKAN VOLUME (userAccess) ─────────────────────────────
    // ✅ Sesuai schema: userAccess { userId, packageId }
    // Production: ganti userId dengan hasil decode session token
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
    // ✅ Sesuai schema: questions { id, packageId, kategori, pertanyaan, pilihan, pembahasan }
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
    // ✅ Hapus field pembahasan & poin dari pilihan — jangan kirim ke client saat ujian
    const soalSanitized = dataSoal.map((soal) => {
      const daftarPilihan = soal.pilihan as Array<{
        opsi: string;
        teks: string;
        poin: number;
      }>;

      return {
        id: soal.id,
        kategori: soal.kategori, // "TWK" | "TIU" | "TKP"
        pertanyaan: soal.pertanyaan,
        // pembahasan sengaja tidak diikutkan
        pilihan: daftarPilihan.map((p) => ({
          opsi: p.opsi,
          teks: p.teks,
          // poin sengaja tidak diikutkan
        })),
      };
    });

    return NextResponse.json({ success: true, data: soalSanitized });
  } catch (err) {
    console.error("[GET /api/soal]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data soal. Coba lagi nanti." },
      { status: 500 }
    );
  }
}