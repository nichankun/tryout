"use server";

import { cookies } from "next/headers";
// import { db } from "@/lib/db";
// import { jawaban, soal } from "@/lib/db/schema";
// import { eq, and } from "drizzle-orm";

// ── TYPES ──────────────────────────────────────────────────────────────────

type KategoriSoal = "TWK" | "TIU" | "TKP";

interface JawabanItem {
  soalId: number;
  selectedKey: string; // "A" | "B" | "C" | "D" | "E"
  kategori: KategoriSoal;
}

interface SubmitJawabanPayload {
  volumeId: number;
  jawaban: JawabanItem[];
}

interface HasilKategori {
  benar: number;
  salah: number;
  kosong: number;
  nilai: number;
}

interface SubmitJawabanResult {
  error: string | null;
  hasilId?: string;
  nilai?: {
    TWK: HasilKategori;
    TIU: HasilKategori;
    TKP: HasilKategori;
    total: number;
  };
}

// ── PASSING GRADE BKN 2024 ────────────────────────────────────────────────

const PASSING_GRADE: Record<KategoriSoal, number> = {
  TWK: 65,
  TIU: 80,
  TKP: 166,
};

// ── BOBOT NILAI ───────────────────────────────────────────────────────────
// TWK & TIU: benar=5, salah=0, kosong=0
// TKP: tidak ada jawaban salah, tiap opsi punya bobot 1–5

const BOBOT_TWK_TIU = { benar: 5, salah: 0, kosong: 0 };

// ── MOCK DATA KUNCI JAWABAN ───────────────────────────────────────────────
// Ganti dengan query database setelah schema siap

const MOCK_KUNCI: Record<number, { key: string; kategori: KategoriSoal; bobotTKP?: Record<string, number> }> = {
  // Contoh soal TWK (id 1–35)
  1:  { key: "A", kategori: "TWK" },
  2:  { key: "C", kategori: "TWK" },
  3:  { key: "B", kategori: "TWK" },
  // Contoh soal TIU (id 36–75)
  36: { key: "D", kategori: "TIU" },
  37: { key: "A", kategori: "TIU" },
  // Contoh soal TKP (id 76–110) — bobot per opsi
  76: {
    key: "A", // key tidak dipakai untuk TKP, bobot per opsi yang dihitung
    kategori: "TKP",
    bobotTKP: { A: 5, B: 4, C: 3, D: 2, E: 1 },
  },
  77: {
    key: "A",
    kategori: "TKP",
    bobotTKP: { A: 1, B: 2, C: 3, D: 4, E: 5 },
  },
};

// ── HELPER: hitung nilai per kategori ────────────────────────────────────

function hitungKategori(
  items: JawabanItem[],
  kunci: typeof MOCK_KUNCI,
  kategori: KategoriSoal
): HasilKategori {
  let benar = 0;
  let salah = 0;
  let kosong = 0;
  let nilai = 0;

  for (const item of items) {
    if (item.kategori !== kategori) continue;

    const kunciSoal = kunci[item.soalId];
    if (!kunciSoal) continue;

    // Jawaban kosong
    if (!item.selectedKey) {
      kosong++;
      continue;
    }

    if (kategori === "TKP") {
      // TKP: tidak ada salah, hitung bobot opsi yang dipilih
      const bobot = kunciSoal.bobotTKP?.[item.selectedKey] ?? 0;
      nilai += bobot;
      benar++; // TKP semua dianggap "dijawab"
    } else {
      // TWK & TIU: benar/salah
      if (item.selectedKey === kunciSoal.key) {
        benar++;
        nilai += BOBOT_TWK_TIU.benar;
      } else {
        salah++;
        nilai += BOBOT_TWK_TIU.salah;
      }
    }
  }

  return { benar, salah, kosong, nilai };
}

// ── SERVER ACTION ─────────────────────────────────────────────────────────

export async function submitJawabanAction(
  payload: SubmitJawabanPayload
): Promise<SubmitJawabanResult> {
  // ── 1. AUTH CHECK ──
  const cookieStore = await cookies();
  const session = cookieStore.get("SESSION_COOKIE");
  if (!session?.value) {
    return { error: "UNAUTHORIZED" };
  }

  // ── 2. VALIDASI PAYLOAD ──
  const { volumeId, jawaban: jawabanList } = payload;

  if (!volumeId || isNaN(volumeId) || volumeId < 1 || volumeId > 20) {
    return { error: "INVALID_VOLUME" };
  }
  if (!Array.isArray(jawabanList) || jawabanList.length === 0) {
    return { error: "EMPTY_JAWABAN" };
  }
  if (jawabanList.length > 110) {
    return { error: "TOO_MANY_JAWABAN" };
  }

  try {
    // ── 3. AMBIL KUNCI JAWABAN ──
    // Production: ganti dengan query DB
    // const kunciDB = await db.query.soal.findMany({
    //   where: eq(soal.volumeId, volumeId),
    //   columns: { id: true, kunciJawaban: true, kategori: true, bobotTKP: true },
    // });
    const kunci = MOCK_KUNCI;

    // ── 4. HITUNG NILAI PER KATEGORI ──
    const TWK = hitungKategori(jawabanList, kunci, "TWK");
    const TIU = hitungKategori(jawabanList, kunci, "TIU");
    const TKP = hitungKategori(jawabanList, kunci, "TKP");
    const total = TWK.nilai + TIU.nilai + TKP.nilai;

    // ── 5. SIMPAN HASIL KE DATABASE ──
    // Production: simpan ke tabel hasil
    // const [hasil] = await db.insert(hasilTryout).values({
    //   userId: session.userId,
    //   volumeId,
    //   nilaiTWK: TWK.nilai,
    //   nilaiTIU: TIU.nilai,
    //   nilaiTKP: TKP.nilai,
    //   total,
    //   lolos:
    //     TWK.nilai >= PASSING_GRADE.TWK &&
    //     TIU.nilai >= PASSING_GRADE.TIU &&
    //     TKP.nilai >= PASSING_GRADE.TKP,
    //   jawabanDetail: JSON.stringify(jawabanList),
    // }).returning({ id: hasilTryout.id });

    // PLACEHOLDER hasilId
    const hasilId = `hasil-${volumeId}-${Date.now()}`;

    return {
      error: null,
      hasilId,
      nilai: { TWK, TIU, TKP, total },
    };
  } catch (err) {
    console.error("[submitJawabanAction]", err);
    return { error: "SERVER_ERROR" };
  }
}

// Re-export passing grade agar bisa dipakai di halaman hasil
export { PASSING_GRADE };