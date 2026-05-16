import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { questions, tryoutHistories, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";

// Passing grade resmi BKN
const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };

export async function POST(request: Request) {
  // ── 1. AUTH CHECK ──────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("SESSION_COOKIE")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // ── 2. DECODE SESSION → userId ─────────────────────────────────────────
  // Production: ganti dengan decode JWT / lookup session table
  // const userId = await getUserIdFromSession(sessionToken);
  // if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = "00000000-0000-0000-0000-000000000000"; // placeholder

  try {
    const body = await request.json();
    const { packageId, answers } = body;

    // ── 3. VALIDASI PAYLOAD ────────────────────────────────────────────────
    if (!packageId) {
      return NextResponse.json(
        { error: "packageId wajib disertakan." },
        { status: 400 }
      );
    }

    const parsedPackageId = parseInt(packageId, 10);
    if (isNaN(parsedPackageId) || parsedPackageId < 1 || parsedPackageId > 20) {
      return NextResponse.json(
        { error: "packageId tidak valid. Harus angka antara 1–20." },
        { status: 400 }
      );
    }

    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers) ||
      Object.keys(answers).length === 0
    ) {
      return NextResponse.json(
        { error: "Format jawaban tidak valid." },
        { status: 400 }
      );
    }

    const VALID_KEYS = new Set(["A", "B", "C", "D", "E"]);
    const answersTyped = answers as Record<string, string>;
    for (const [soalId, opsi] of Object.entries(answersTyped)) {
      if (isNaN(Number(soalId)) || !VALID_KEYS.has(opsi)) {
        return NextResponse.json(
          { error: "Isi jawaban tidak valid." },
          { status: 400 }
        );
      }
    }

    // ── 4. CEK KEPEMILIKAN VOLUME ──────────────────────────────────────────
    // ✅ Sesuai schema: userAccess { userId, packageId }
    const access = await db.query.userAccess.findFirst({
      where: and(
        eq(userAccess.userId, userId),
        eq(userAccess.packageId, parsedPackageId)
      ),
    });

    if (!access) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // ── 5. AMBIL KUNCI JAWABAN ─────────────────────────────────────────────
    // ✅ Sesuai schema: questions { id, packageId, kategori, pilihan (jsonb) }
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.packageId, parsedPackageId));

    if (dbQuestions.length === 0) {
      return NextResponse.json(
        { error: "Soal untuk paket ini tidak ditemukan." },
        { status: 404 }
      );
    }

    // ── 6. HITUNG SKOR SERVER-SIDE ─────────────────────────────────────────
    let skorTwk = 0;
    let skorTiu = 0;
    let skorTkp = 0;

    for (const soal of dbQuestions) {
      const jawabanUser = answersTyped[soal.id.toString()];
      if (!jawabanUser) continue;

      const daftarPilihan = soal.pilihan as Array<{
        opsi: string;
        teks: string;
        poin: number;
      }>;

      const opsiCocok = daftarPilihan.find((p) => p.opsi === jawabanUser);
      if (!opsiCocok) continue;

      const poin = opsiCocok.poin ?? 0;

      if (soal.kategori === "TWK") skorTwk += poin;
      else if (soal.kategori === "TIU") skorTiu += poin;
      else if (soal.kategori === "TKP") skorTkp += poin;
    }

    const totalSkor = skorTwk + skorTiu + skorTkp;
    const isLolosUjian =
      skorTwk >= PASSING_GRADE.TWK &&
      skorTiu >= PASSING_GRADE.TIU &&
      skorTkp >= PASSING_GRADE.TKP;

    // ── 7. SIMPAN HASIL ────────────────────────────────────────────────────
    // ✅ Sesuai schema tryoutHistories:
    // { userId, packageId, skorTwk, skorTiu, skorTkp, totalSkor, isLolos, jawabanSiswa, endTime }
    const [insertedHistory] = await db
      .insert(tryoutHistories)
      .values({
        userId,
        packageId: parsedPackageId,
        skorTwk,
        skorTiu,
        skorTkp,
        totalSkor,
        isLolos: isLolosUjian,
        jawabanSiswa: answers,
        endTime: new Date(),
      })
      .returning({ id: tryoutHistories.id });

    return NextResponse.json({
      success: true,
      historyId: insertedHistory.id,
    });
  } catch (err) {
    console.error("[POST /api/submit]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem. Coba lagi nanti." },
      { status: 500 }
    );
  }
}