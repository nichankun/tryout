"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Copy, Sparkles, RefreshCw, Eye, BookOpen } from "lucide-react";
import { FiguralRenderer, FiguralTipe } from "@/components/tryout/figural-renderer";
import { toast } from "sonner"; 
import { Badge } from "@/components/ui/badge";

// Data kamus untuk referensi di Section 2
const REFERENCE_DICTIONARY = [
  {
    kategori: "Silogisme (Diagram Venn)",
    keys: ["semua_dalam", "sebagian_irisan", "tidak_ada_terpisah"]
  },
  {
    kategori: "Analogi Gambar",
    keys: ["persegi_lingkaran_kiri", "persegi_lingkaran_kiri_kanan", "segitiga_bintang_puncak", "panah_utara_tebal", "panah_selatan_tipis_dua", "bujur_sangkar_putih_ganda"]
  },
  {
    kategori: "Analogi Matriks",
    keys: ["titik_dalam_segitiga", "titik_luar_segitiga", "garis_dalam_lingkaran", "garis_singgung_luar_lingkaran"]
  },
  {
    kategori: "Ketidaksamaan (Huruf & Bentuk)",
    keys: ["huruf_e", "huruf_f", "huruf_h", "huruf_z", "huruf_l", "potong_simetris_segienam", "potong_simetris_bujursangkar", "potong_simetris_trapesium", "potong_simetris_belahketupat", "potong_mercy_lingkaran", "2d_segitiga_bujursangkar"]
  },
  {
    kategori: "Ketidaksamaan 3D",
    keys: ["3d_prisma_kubus", "3d_tabung_kerucut", "3d_piramida_limas", "3d_bola_elipsoid"]
  },
  {
    kategori: "Pencerminan",
    keys: ["asli", "cermin_h", "cermin_v", "cermin_hv"]
  }
];

export default function AdminFiguralPage() {
  // --- STATE UNTUK PLAYGROUND ---
  const [tipe, setTipe] = React.useState<FiguralTipe>("deret_rotasi");
  const [angle, setAngle] = React.useState<string | number>(45);
  const [size, setSize] = React.useState(120);

  // Fungsi salin konfigurasi ke clipboard
  const copyConfig = () => {
    const config = JSON.stringify({ tipe, angle }, null, 2);
    navigator.clipboard.writeText(config);
    toast.success("Konfigurasi berhasil disalin!");
  };

  // Helper untuk menentukan placeholder input
  const getPlaceholder = () => {
    if (tipe === "silogisme") return "misal: semua_dalam, sebagian_irisan";
    if (tipe === "pencerminan") return "misal: cermin_h, cermin_v";
    return "Ketik nama pola (misal: huruf_e)";
  };

  return (
    <div className="container mx-auto space-y-8 p-6 pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-purple-950">
            Studio Figural <Sparkles className="inline-block h-6 w-6 text-purple-500" />
          </h1>
          <p className="text-muted-foreground">Rancang dan uji pola visual soal TIU Figural & Silogisme secara instan.</p>
        </div>
      </div>

      {/* ── SECTION 1: LIVE PLAYGROUND (INTERAKTIF) ── */}
      <Card className="border-2 border-purple-200 bg-linear-to-br from-white to-purple-50/30 shadow-xl">
        <CardHeader className="border-b border-purple-100 bg-white/50">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-xl text-purple-900">Live Playground</CardTitle>
          </div>
          <CardDescription>Sesuaikan parameter di bawah untuk melihat hasil render SVG secara real-time.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 p-8 lg:grid-cols-2">
          
          {/* Panel Kontrol */}
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label htmlFor="tipe" className="text-sm font-bold text-purple-900">Tipe Visualisasi</Label>
              <Select value={tipe} onValueChange={(v) => {
                setTipe(v as FiguralTipe);
                // Reset angle default sesuai tipe (agar tidak error / aneh saat switch)
                if (["deret_rotasi", "matriks", "deret_bangun", "tumpukan_balok"].includes(v)) {
                  setAngle(v === "deret_rotasi" ? 45 : 3);
                } else if (v === "silogisme") {
                  setAngle("sebagian_irisan");
                } else {
                  setAngle("");
                }
              }}>
                <SelectTrigger id="tipe" className="border-purple-200 focus:ring-purple-500">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silogisme">Silogisme (Diagram Venn)</SelectItem>
                  <SelectItem value="deret_rotasi">Deret Rotasi (Trigonometri)</SelectItem>
                  <SelectItem value="matriks">Matriks (Grid 3x3)</SelectItem>
                  <SelectItem value="pencerminan">Pencerminan (Refleksi)</SelectItem>
                  <SelectItem value="analogi_gambar">Analogi Gambar (Dictionary)</SelectItem>
                  <SelectItem value="analogi_matriks">Analogi Matriks (Komposisi)</SelectItem>
                  <SelectItem value="ketidaksamaan">Ketidaksamaan (Kombinasi)</SelectItem>
                  <SelectItem value="deret_bangun">Deret Bangun (Sisi N)</SelectItem>
                  <SelectItem value="tumpukan_balok">Tumpukan Balok (3D)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-purple-900">Value (Angle / Key)</Label>
                <span className="rounded-md bg-purple-100 px-2 py-0.5 font-mono text-xs text-purple-700">
                  {typeof angle === "number" ? `${angle}° / unit` : (angle || "kosong")}
                </span>
              </div>
              
              {/* Tampilkan Slider jika tipe berbasis angka, Input jika teks */}
              {["deret_rotasi", "matriks", "deret_bangun", "tumpukan_balok"].includes(tipe) ? (
                <Slider 
                  value={[typeof angle === "number" ? angle : 0]} 
                  max={tipe === "deret_rotasi" ? 360 : tipe === "matriks" ? 9 : 8} 
                  step={tipe === "deret_rotasi" ? 5 : 1}
                  onValueChange={([v]) => setAngle(v)}
                  className="py-4"
                />
              ) : (
                <Input 
                  value={angle} 
                  onChange={(e) => setAngle(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="border-purple-200"
                />
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold text-purple-900">Preview Size: {size}px</Label>
              <Slider value={[size]} min={64} max={200} step={8} onValueChange={([v]) => setSize(v)} />
            </div>

            <Button onClick={copyConfig} className="mt-4 w-full gap-2 bg-purple-700 hover:bg-purple-800">
              <Copy className="h-4 w-4" /> Salin Konfigurasi JSON
            </Button>
          </div>

          {/* Panel Preview Visual */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-white p-10 shadow-inner">
            <div className="relative mb-4 flex items-center justify-center rounded-xl bg-muted/20 p-6 shadow-sm transition-all hover:scale-110">
              <FiguralRenderer tipe={tipe} angle={angle} size={size} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hasil Render SVG</p>
              <p className="mt-1 text-[11px] text-purple-400 italic">Live Procedural Preview</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2: KATALOG LENGKAP (REFERENCE) ── */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-purple-950">Kamus Referensi Pola Teks (Dictionary)</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Gunakan teks / <i>key</i> di bawah ini untuk mengisi input <b>Value</b> pada tipe gambar yang berbasis kamus teks. Anda dapat mengkliknya untuk otomatis menguji di <i>playground</i>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REFERENCE_DICTIONARY.map((section, idx) => (
            <Card key={idx} className="border border-purple-100 shadow-sm">
              <CardHeader className="bg-purple-50/50 pb-3">
                <CardTitle className="text-sm font-bold text-purple-800">{section.kategori}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {section.keys.map((k) => (
                    <Badge 
                      key={k} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-purple-200 hover:text-purple-900 transition-colors"
                      onClick={() => {
                        // Fitur Auto-Set ketika badge diklik
                        if (section.kategori.includes("Silogisme")) setTipe("silogisme");
                        else if (section.kategori.includes("Analogi Gambar")) setTipe("analogi_gambar");
                        else if (section.kategori.includes("Analogi Matriks")) setTipe("analogi_matriks");
                        else if (section.kategori.includes("Pencerminan")) setTipe("pencerminan");
                        else setTipe("ketidaksamaan");
                        
                        setAngle(k);
                        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas saat di-klik
                      }}
                    >
                      {k}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}