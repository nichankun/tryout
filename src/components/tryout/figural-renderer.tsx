"use client";

/**
 * components/tryout/figural-renderer.tsx
 *
 * Komponen Client generik untuk merender soal TIU Figural secara prosedural (SVG).
 * Sangat ringan, cepat, dan otomatis beradaptasi dengan Dark/Light mode sistem.
 *
 * Mendukung 8 tipe figural + string key dictionary untuk semua soal JSON:
 *  1. deret_rotasi     — angle: number (derajat)
 *  2. matriks          — angle: number (jumlah sel terisi 0-9)
 *  3. pencerminan      — angle: number|"asli"|"cermin_h"|"cermin_v"|"cermin_hv"
 *  4. analogi_gambar   — angle: string key (persegi_lingkaran_kiri, dll.) | number
 *  5. analogi_matriks  — angle: string key (titik_dalam_segitiga, dll.) | number
 *  6. ketidaksamaan    — angle: string key (huruf_e, potong_simetris_*, 3d_*, dll.) | number
 *  7. deret_bangun     — angle: number (jumlah sisi 3-8)
 *  8. tumpukan_balok   — angle: number (jumlah balok 1-6)
 */

import * as React from "react";

// ==========================================
// TIPE
// ==========================================
export type FiguralTipe =
  | "deret_rotasi"
  | "matriks"
  | "pencerminan"
  | "analogi_gambar"
  | "analogi_matriks"
  | "ketidaksamaan"
  | "deret_bangun"
  | "tumpukan_balok";

interface FiguralRendererProps {
  tipe: FiguralTipe;
  angle: string | number;
  size?: number;
}

// ==========================================
// HELPERS
// ==========================================
function toNumber(val: string | number, fallback = 0): number {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isFinite(n) ? n : fallback;
}

// Warna dari CSS variable (currentColor) dibedakan via opacity agar tetap theme-safe
const C  = "currentColor"; // warna utama (text-primary)

// ==========================================
// BINGKAI STANDAR (dipakai semua sub-komponen)
// ==========================================
const Frame = () => (
  <rect x="8" y="8" width="84" height="84" fill="none"
    stroke={C} strokeWidth="3.5" rx="7" className="text-border" />
);

// ==========================================
// DICTIONARY: ANALOGI_GAMBAR
// Setiap key → fungsi render konten SVG (tanpa bingkai)
// ==========================================
type RenderFn = () => React.ReactElement;

const ANALOGI_GAMBAR_DICT: Record<string, RenderFn> = {

  // Persegi + lingkaran kecil sudut kiri atas
  persegi_lingkaran_kiri: () => (
    <>
      <rect x="22" y="22" width="56" height="56" rx="4"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <circle cx="26" cy="26" r="7" fill={C} className="text-primary" />
    </>
  ),

  // Persegi + dua lingkaran (kiri atas + kanan bawah)
  persegi_lingkaran_kiri_kanan: () => (
    <>
      <rect x="22" y="22" width="56" height="56" rx="4"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <circle cx="26" cy="26" r="7" fill={C} className="text-primary" />
      <circle cx="74" cy="74" r="7" fill={C} className="text-primary" />
    </>
  ),

  // Segitiga + bintang kecil di puncak
  segitiga_bintang_puncak: () => (
    <>
      <polygon points="50,16 82,80 18,80"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <Star cx={50} cy={18} r={7} />
    </>
  ),

  // Panah tunggal menghadap UTARA, ekor tebal
  panah_utara_tebal: () => (
    <>
      {/* Badan panah tebal */}
      <rect x="43" y="42" width="14" height="30" rx="2"
        fill={C} className="text-primary" />
      {/* Kepala panah */}
      <polygon points="50,14 68,44 32,44"
        fill={C} className="text-primary" />
    </>
  ),

  // Dua panah menghadap SELATAN, ekor tipis
  panah_selatan_tipis_dua: () => (
    <>
      {/* Panah kiri */}
      <g transform="translate(-18,0)">
        <rect x="47" y="28" width="6" height="30" rx="1"
          fill={C} className="text-primary" />
        <polygon points="50,86 40,56 60,56"
          fill={C} className="text-primary" />
      </g>
      {/* Panah kanan */}
      <g transform="translate(18,0)">
        <rect x="47" y="28" width="6" height="30" rx="1"
          fill={C} className="text-primary" />
        <polygon points="50,86 40,56 60,56"
          fill={C} className="text-primary" />
      </g>
    </>
  ),

  // Bujur sangkar berwarna PUTIH berlapis garis ganda
  bujur_sangkar_putih_ganda: () => (
    <>
      {/* Garis luar */}
      <rect x="20" y="20" width="60" height="60" rx="3"
        fill="none" stroke={C} strokeWidth="3.5" className="text-primary" />
      {/* Garis dalam (ganda) */}
      <rect x="27" y="27" width="46" height="46" rx="2"
        fill="none" stroke={C} strokeWidth="1.5" className="text-primary" />
    </>
  ),
};

// ==========================================
// DICTIONARY: ANALOGI_MATRIKS
// ==========================================
const ANALOGI_MATRIKS_DICT: Record<string, RenderFn> = {

  // Titik di DALAM segitiga
  titik_dalam_segitiga: () => (
    <>
      <polygon points="50,18 80,78 20,78"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <circle cx="50" cy="58" r="7" fill={C} className="text-primary" />
    </>
  ),

  // Titik MENEMPEL di sisi luar segitiga
  titik_luar_segitiga: () => (
    <>
      <polygon points="50,18 80,78 20,78"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      {/* Titik menempel di tengah sisi kanan */}
      <circle cx="82" cy="56" r="7" fill={C} className="text-primary" />
    </>
  ),

  // Garis MELINTANG di dalam lingkaran
  garis_dalam_lingkaran: () => (
    <>
      <circle cx="50" cy="50" r="32"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <line x1="20" y1="50" x2="80" y2="50"
        stroke={C} strokeWidth="3" className="text-primary" />
    </>
  ),

  // Garis MENYINGGUNG di luar lingkaran (hasil transformasi)
  garis_singgung_luar_lingkaran: () => (
    <>
      <circle cx="50" cy="50" r="32"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      {/* Garis singgung di bawah */}
      <line x1="14" y1="82" x2="86" y2="82"
        stroke={C} strokeWidth="3" className="text-primary" />
    </>
  ),
};

// ==========================================
// DICTIONARY: KETIDAKSAMAAN
// ==========================================
const KETIDAKSAMAAN_DICT: Record<string, RenderFn> = {

  // ── HURUF-HURUF ──────────────────────────────────────────────
  huruf_e: () => (
    <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight="bold"
      fontFamily="serif" fill={C} className="text-primary">E</text>
  ),
  huruf_f: () => (
    <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight="bold"
      fontFamily="serif" fill={C} className="text-primary">F</text>
  ),
  huruf_h: () => (
    <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight="bold"
      fontFamily="serif" fill={C} className="text-primary">H</text>
  ),
  huruf_z: () => (
    <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight="bold"
      fontFamily="serif" fill={C} className="text-primary">Z</text>
  ),
  huruf_l: () => (
    <text x="50" y="68" textAnchor="middle" fontSize="58" fontWeight="bold"
      fontFamily="serif" fill={C} className="text-primary">L</text>
  ),

  // ── PEMOTONGAN SIMETRIS ────────────────────────────────────────

  // Segienam dipotong dua sama besar (garis horizontal di tengah)
  potong_simetris_segienam: () => (
    <>
      <polygon points="50,16 76,32 76,68 50,84 24,68 24,32"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <line x1="24" y1="50" x2="76" y2="50"
        stroke={C} strokeWidth="2.5" strokeDasharray="5,3" className="text-primary" />
    </>
  ),

  // Bujur sangkar dipotong diagonal
  potong_simetris_bujursangkar: () => (
    <>
      <rect x="20" y="20" width="60" height="60" rx="3"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <line x1="20" y1="20" x2="80" y2="80"
        stroke={C} strokeWidth="2.5" strokeDasharray="5,3" className="text-primary" />
    </>
  ),

  // Trapesium sama kaki dibelah vertikal
  potong_simetris_trapesium: () => (
    <>
      <polygon points="30,22 70,22 82,78 18,78"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <line x1="50" y1="22" x2="50" y2="78"
        stroke={C} strokeWidth="2.5" strokeDasharray="5,3" className="text-primary" />
    </>
  ),

  // Belah ketupat dengan garis dari sudut ke sudut
  potong_simetris_belahketupat: () => (
    <>
      <polygon points="50,14 82,50 50,86 18,50"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      <line x1="50" y1="14" x2="50" y2="86"
        stroke={C} strokeWidth="2.5" strokeDasharray="5,3" className="text-primary" />
    </>
  ),

  // Lingkaran dipotong 3 dari pusat (logo mercy / 120°)
  potong_mercy_lingkaran: () => (
    <>
      <circle cx="50" cy="50" r="34"
        fill="none" stroke={C} strokeWidth="3" className="text-primary" />
      {/* 3 garis dari pusat berjarak 120° */}
      {[90, 210, 330].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={i}
            x1="50" y1="50"
            x2={50 + 34 * Math.cos(rad)}
            y2={50 + 34 * Math.sin(rad)}
            stroke={C} strokeWidth="2.5" strokeDasharray="5,3"
            className="text-primary" />
        );
      })}
    </>
  ),

  // ── BANGUN 3D ──────────────────────────────────────────────────

  // Prisma segi-4 (kubus perspektif)
  "3d_prisma_kubus": () => (
    <>
      {/* Muka depan */}
      <rect x="22" y="36" width="40" height="40" rx="2"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      {/* Muka atas (jajaran genjang) */}
      <polygon points="22,36 38,20 78,20 62,36"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      {/* Muka kanan */}
      <polygon points="62,36 78,20 78,60 62,76"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
    </>
  ),

  // Tabung + kerucut
  "3d_tabung_kerucut": () => (
    <>
      {/* Tabung kiri */}
      <ellipse cx="30" cy="66" rx="16" ry="6"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      <line x1="14" y1="66" x2="14" y2="38"
        stroke={C} strokeWidth="2.5" className="text-primary" />
      <line x1="46" y1="66" x2="46" y2="38"
        stroke={C} strokeWidth="2.5" className="text-primary" />
      <ellipse cx="30" cy="38" rx="16" ry="6"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      {/* Kerucut kanan */}
      <polygon points="70,18 56,76 84,76"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      <ellipse cx="70" cy="76" rx="14" ry="5"
        fill="none" stroke={C} strokeWidth="2" className="text-primary" />
    </>
  ),

  // Piramida / limas
  "3d_piramida_limas": () => (
    <>
      {/* Alas persegi perspektif */}
      <polygon points="28,72 56,80 80,64 52,56"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      {/* 4 rusuk ke puncak */}
      {([[28,72],[56,80],[80,64],[52,56]] as [number,number][]).map(([x,y],i) => (
        <line key={i} x1={x} y1={y} x2="54" y2="18"
          stroke={C} strokeWidth="2.5" className="text-primary" />
      ))}
    </>
  ),

  // Bola + elipsoid
  "3d_bola_elipsoid": () => (
    <>
      {/* Bola kiri */}
      <circle cx="28" cy="50" r="20"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      <ellipse cx="28" cy="50" rx="20" ry="8"
        fill="none" stroke={C} strokeWidth="1.5" strokeDasharray="4,3"
        className="text-primary" />
      {/* Elipsoid kanan */}
      <ellipse cx="72" cy="50" rx="22" ry="14"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      <ellipse cx="72" cy="50" rx="22" ry="6"
        fill="none" stroke={C} strokeWidth="1.5" strokeDasharray="4,3"
        className="text-primary" />
    </>
  ),

  // ── BANGUN 2D ──────────────────────────────────────────────────

  // Segitiga + bujur sangkar (2D)
  "2d_segitiga_bujursangkar": () => (
    <>
      {/* Segitiga kiri */}
      <polygon points="26,76 14,76 20,58"
        fill={C} className="text-primary" />
      <polygon points="26,76 50,22 74,76"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
      {/* Bujur sangkar kanan — berdiri sendiri */}
      <rect x="60" y="54" width="26" height="26" rx="2"
        fill="none" stroke={C} strokeWidth="2.5" className="text-primary" />
    </>
  ),
};

// ==========================================
// LOOKUP HELPER: cari di dictionary, fallback ke angka
// ==========================================
function lookupDict(
  dict: Record<string, RenderFn>,
  key: string | number,
  fallbackFn: (n: number) => React.ReactElement
): React.ReactElement {
  if (typeof key === "string" && dict[key]) {
    return dict[key]();
  }
  return fallbackFn(toNumber(key));
}

// ==========================================
// HELPER: Bintang kecil (dipakai oleh analogi_gambar)
// ==========================================
function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts = Array.from({ length: 10 }).map((_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
  return <polygon points={pts} fill={C} className="text-primary" />;
}

// ==========================================
// SUB-KOMPONEN TIAP TIPE
// ==========================================

function DeretRotasi({ angle }: { angle: string | number }) {
  const deg = toNumber(angle);
  return (
    <>
      <Frame />
      <g style={{ transformOrigin: "50px 50px", transform: `rotate(${deg}deg)` }}>
        <polygon points="50,18 72,62 28,62"
          fill={C} className="text-primary" />
        <circle cx="50" cy="18" r="6" fill="currentColor" className="text-red-500" />
      </g>
    </>
  );
}

function Matriks({ angle }: { angle: string | number }) {
  const filled = Math.abs(toNumber(angle, 3)) % 10;
  return (
    <>
      <Frame />
      {Array.from({ length: 9 }, (_, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 20 + col * 24, y = 20 + row * 24;
        return i < filled
          ? <rect key={i} x={x} y={y} width="16" height="16" rx="3"
              fill={C} className="text-primary" />
          : <rect key={i} x={x} y={y} width="16" height="16" rx="3"
              fill="none" stroke={C} strokeWidth="1.5" className="text-muted-foreground" />;
      })}
    </>
  );
}

function Pencerminan({ angle }: { angle: string | number }) {
  type Mode = "asli" | "cermin_h" | "cermin_v" | "cermin_hv";
  const modeMap: Record<number, Mode> = { 0:"asli", 1:"cermin_h", 2:"cermin_v", 3:"cermin_hv" };
  const mode: Mode = typeof angle === "string"
    ? (angle as Mode)
    : modeMap[toNumber(angle) % 4] ?? "asli";
  const flipX = mode === "cermin_h" || mode === "cermin_hv" ? -1 : 1;
  const flipY = mode === "cermin_v" || mode === "cermin_hv" ? -1 : 1;
  return (
    <>
      <Frame />
      <g style={{ transformOrigin: "50px 50px", transform: `scale(${flipX},${flipY})` }}>
        <path d="M 30,30 L 30,60 L 60,60 L 60,52 L 38,52 L 38,30 Z"
          fill={C} className="text-primary" />
        <path d="M 60,60 L 48,70 L 72,70 Z"
          fill={C} className="text-primary" />
      </g>
    </>
  );
}

function AnalogiGambar({ angle }: { angle: string | number }) {
  return (
    <>
      <Frame />
      {lookupDict(ANALOGI_GAMBAR_DICT, angle, (n) => {
        // fallback numerik: persegi mengecil
        const sizes = [60, 46, 32, 18];
        const s = sizes[n % 4];
        const x = (100 - s) / 2;
        return (
          <>
            <rect x={x} y={x} width={s} height={s} rx="4"
              fill={C} className="text-primary" />
            <circle cx="72" cy="72" r="7" fill="currentColor" className="text-red-500" />
          </>
        );
      })}
    </>
  );
}

function AnalogiMatriks({ angle }: { angle: string | number }) {
  return (
    <>
      <Frame />
      {lookupDict(ANALOGI_MATRIKS_DICT, angle, (n) => {
        // fallback numerik: titik-titik
        const leftCount  = [1,2,3,4][n % 4];
        const rightCount = [2,3,4,1][n % 4];
        return (
          <>
            <line x1="50" y1="16" x2="50" y2="84"
              stroke={C} strokeWidth="1.5" strokeDasharray="4,3"
              className="text-muted-foreground" />
            {Array.from({length: leftCount},  (_,i) => <circle key={`l${i}`} cx={30} cy={20+i*20} r="7" fill={C} className="text-primary" />)}
            {Array.from({length: rightCount}, (_,i) => <circle key={`r${i}`} cx={68} cy={20+i*20} r="7" fill={C} className="text-primary" />)}
          </>
        );
      })}
    </>
  );
}

function Ketidaksamaan({ angle }: { angle: string | number }) {
  return (
    <>
      <Frame />
      {lookupDict(KETIDAKSAMAAN_DICT, angle, (n) => {
        // fallback numerik: dua bentuk
        const configs = [
          {s1:"circle",s2:"rect"},{s1:"rect",s2:"polygon"},
          {s1:"polygon",s2:"circle"},{s1:"circle",s2:"circle"},
        ] as const;
        const {s1,s2} = configs[n % 4];
        const renderShape = (type: string, cx: number) => {
          if (type==="circle")  return <circle cx={cx} cy="50" r="20" fill={C} className="text-primary" />;
          if (type==="rect")    return <rect x={cx-18} y="32" width="36" height="36" rx="5" fill={C} className="text-primary" />;
          return <polygon points={`${cx},28 ${cx+22},68 ${cx-22},68`} fill={C} className="text-primary" />;
        };
        return (
          <>
            {renderShape(s1, 30)}
            <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="bold"
              fill={C} className="text-muted-foreground">≠</text>
            {renderShape(s2, 72)}
          </>
        );
      })}
    </>
  );
}

function DeretBangun({ angle }: { angle: string | number }) {
  const sides = Math.max(3, Math.min(8, toNumber(angle, 3)));
  const r = 32, cx = 50, cy = 50;
  const points = Array.from({length: sides}).map((_, i) => {
    const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <>
      <Frame />
      <polygon points={points}
        fill="none" stroke={C} strokeWidth="3.5" className="text-primary" />
      <text x="50" y="55" textAnchor="middle" fontSize="13" fontWeight="bold"
        fill={C} className="text-primary">{sides}</text>
    </>
  );
}

function TumpukanBalok({ angle }: { angle: string | number }) {
  const count = Math.max(1, Math.min(6, toNumber(angle, 2)));
  const Block = ({ col, row }: { col: number; row: number }) => {
    const bw=24, bh=12, bd=12;
    const ox = 50 + (col - row) * (bw / 2);
    const oy = 70 - row * (bh + bd / 2) - col * (bh / 2);
    const top   = [[ox,oy],[ox+bw/2,oy-bh/2],[ox+bw,oy],[ox+bw/2,oy+bh/2]].map(p=>p.join(",")).join(" ");
    const left  = [[ox,oy],[ox+bw/2,oy+bh/2],[ox+bw/2,oy+bh/2+bd],[ox,oy+bd]].map(p=>p.join(",")).join(" ");
    const right = [[ox+bw/2,oy+bh/2],[ox+bw,oy],[ox+bw,oy+bd],[ox+bw/2,oy+bh/2+bd]].map(p=>p.join(",")).join(" ");
    return (
      <g>
        <polygon points={top}   fill={C} className="text-primary"    opacity="0.95" />
        <polygon points={left}  fill={C} className="text-primary"    opacity="0.65" />
        <polygon points={right} fill={C} className="text-purple-400" opacity="0.80" />
      </g>
    );
  };
  const blocks = Array.from({length: count}, (_, i) => ({ col: i%3, row: Math.floor(i/3) }));
  return (
    <>
      <Frame />
      {blocks.map((b, i) => <Block key={i} col={b.col} row={b.row} />)}
    </>
  );
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export const FiguralRenderer = React.memo(
  ({ tipe, angle = 0, size = 64 }: FiguralRendererProps) => {
    const renderContent = () => {
      switch (tipe) {
        case "deret_rotasi":    return <DeretRotasi    angle={angle} />;
        case "matriks":         return <Matriks        angle={angle} />;
        case "pencerminan":     return <Pencerminan    angle={angle} />;
        case "analogi_gambar":  return <AnalogiGambar  angle={angle} />;
        case "analogi_matriks": return <AnalogiMatriks angle={angle} />;
        case "ketidaksamaan":   return <Ketidaksamaan  angle={angle} />;
        case "deret_bangun":    return <DeretBangun    angle={angle} />;
        case "tumpukan_balok":  return <TumpukanBalok  angle={angle} />;
        default:
          return (
            <>
              <Frame />
              <text x="50" y="55" textAnchor="middle" fontSize="9"
                fill={C} className="text-muted-foreground">{tipe}</text>
            </>
          );
      }
    };

    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="text-foreground"
        aria-label={`Gambar figural tipe ${tipe}, nilai ${angle}`}
      >
        {renderContent()}
      </svg>
    );
  }
);

FiguralRenderer.displayName = "FiguralRenderer";