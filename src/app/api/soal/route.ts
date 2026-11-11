/**
 * app/api/soal/route.ts
 * * Route Handler untuk mengambil data bank soal ujian simulasi CAT.
 * Dioptimalkan dengan Relational API (Partial Query) dan Defensive Parsing.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/db";
import { questions, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { consumeAccountRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA
// ==========================================
const API_ERRORS = {
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  invalidParam: "volumeId tidak valid.",
  notFound: "Soal untuk volume ini belum tersedia.",
  serverError: "Gagal mengambil data soal.",
} as const;

// Skema untuk sanitasi JSONB
const PilihanSchema = z.array(
  z.object({
    opsi:     z.string(),
    teks:     z.string(),
    poin:     z.number(),
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
  })
);

// ==========================================
// METHOD HANDLER: GET
// ==========================================
export async function GET(request: Request) {
  // 1. Autentikasi
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: API_ERRORS.unauthorized }, { status: 401 });
  }

  // 2. Validasi Parameter
  const { searchParams } = new URL(request.url);
  const volumeId = parseInt(searchParams.get("volumeId") ?? "", 10);

  if (isNaN(volumeId) || volumeId < 1) {
    return NextResponse.json({ error: API_ERRORS.invalidParam }, { status: 400 });
  }

  const rateLimit = await consumeAccountRateLimit({
    namespace: "question-fetch",
    headers: request.headers,
    identifier: session.user.id,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimit.storageUnavailable) {
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "60" } });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  }

  try {
    // 3. PARALLEL FETCHING: Cek Akses & Tarik Soal
    const [access, dataSoal] = await Promise.all([
      db.query.userAccess.findFirst({
        where: and(eq(userAccess.userId, session.user.id), eq(userAccess.packageId, volumeId)),
        columns: { id: true }
      }),
      db.query.questions.findMany({
        where: eq(questions.packageId, volumeId),
        columns: {
          id: true,
          kategori: true,
          pertanyaan: true,
          imageUrl: true,
          imageAlt: true,
          pilihan: true,
        }
      })
    ]);

    if (!access) {
      return NextResponse.json({ error: API_ERRORS.forbidden }, { status: 403 });
    }

    if (dataSoal.length === 0) {
      return NextResponse.json({ error: API_ERRORS.notFound }, { status: 404 });
    }

    // 4. Sanitasi Data (Anti-Cheat)
    // Menggunakan safeParse agar tidak crash jika ada data JSON yang tidak sesuai
    const soalSanitized = dataSoal.map((soal) => {
      const parsed = PilihanSchema.safeParse(soal.pilihan);
      const daftarPilihan = parsed.success ? parsed.data : [];

      return {
        id: soal.id,
        kategori: soal.kategori,
        pertanyaan: soal.pertanyaan,
        imageUrl: soal.imageUrl,
        imageAlt: soal.imageAlt,
        pilihan: daftarPilihan.map((p) => ({
          opsi: p.opsi,
          teks: p.teks,
          imageUrl: p.imageUrl ?? null,
          imageAlt: p.imageAlt ?? null,
        })),
      };
    });

    return NextResponse.json({ success: true, data: soalSanitized });
  } catch (err) {
    console.error("[API ERROR] GET /api/soal:", err);
    return NextResponse.json({ error: API_ERRORS.serverError }, { status: 500 });
  }
}
