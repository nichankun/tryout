"use client";

/**
 * app/admin/packages/[id]/add-question/page.tsx
 * * Client Component Formulir Manual Pembuatan Soal Baru.
 * * SUDAH MENDUKUNG SOAL TEKS, FIGURAL, & SILOGISME (Diagram Venn).
 * * Bebas dari Error Typescript (Payload Mismatch Fixed).
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuestionAction } from "@/lib/actions/questions";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

// ==========================================
// SCHEMAS VALIDASI FORM (SISI CLIENT)
// ==========================================
const FormQuestionSchema = z.object({
  kategori: z.enum(["TWK", "TIU", "TKP"], {
    errorMap: () => ({ message: "Silakan pilih salah satu kategori materi" }),
  }),
  pertanyaan: z.string().min(10, "Pertanyaan minimal berisi 10 karakter"),
  pembahasan: z.string().min(10, "Pembahasan jawaban minimal berisi 10 karakter"),
  
  // Penambahan Skema untuk Figural & Silogisme
  isFigural: z.boolean().default(false),
  figuralTipe: z.enum([
    "deret_rotasi", "matriks", "pencerminan", "analogi_gambar",
    "analogi_matriks", "ketidaksamaan", "deret_bangun", "tumpukan_balok", "silogisme"
  ]).optional().nullable(),

  pilihan: z.array(
    z.object({
      opsi: z.enum(["A", "B", "C", "D", "E"]),
      // Teks diubah jadi opsional karena soal gambar mungkin tidak ada teksnya
      teks: z.string().optional(), 
      poin: z.number({ invalid_type_error: "Poin harus berupa angka" })
        .int()
        .min(0, "Poin minimal 0")
        .max(5, "Poin maksimal 5"),
      // Parameter input angle/key untuk memanggil gambar SVG
      figuralAngle: z.union([z.string(), z.number()]).optional().nullable(),
    })
  ).length(5),
});

type FormValues = z.infer<typeof FormQuestionSchema>;

// Opsi A-E ditambahkan properti figuralAngle kosong sebagai default
const DEFAULT_OPTIONS = [
  { opsi: "A", teks: "", poin: 0, figuralAngle: "" },
  { opsi: "B", teks: "", poin: 0, figuralAngle: "" },
  { opsi: "C", teks: "", poin: 0, figuralAngle: "" },
  { opsi: "D", teks: "", poin: 0, figuralAngle: "" },
  { opsi: "E", teks: "", poin: 0, figuralAngle: "" },
] as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function AddQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const [isPending, setIsPending] = React.useTransition();
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const packageId = parseInt(params.id as string, 10);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormQuestionSchema),
    defaultValues: {
      kategori: "TWK",
      pertanyaan: "",
      pembahasan: "",
      isFigural: false,
      figuralTipe: null,
      pilihan: [...DEFAULT_OPTIONS] as any,
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "pilihan",
  });

  // Pantau apakah mode figural sedang diaktifkan user untuk mengubah UI
  const isFiguralActive = useWatch({
    control,
    name: "isFigural",
  });

  const onSubmit = (values: FormValues) => {
    setStatusMessage(null);

    setIsPending(async () => {
      // 1. Format array pilihan agar Typescript backend tidak komplain
      // Jika teks kosong, kita paksa jadi string "" (bukan undefined)
      const formattedPilihan = values.pilihan.map((p) => ({
        opsi: p.opsi,
        teks: p.teks || "", 
        poin: p.poin,
        figuralAngle: p.figuralAngle || null,
      }));

      // 2. Susun Payload sesuai dengan Zod Schema di actions/questions.ts
      const payload: any = {
        packageId,
        kategori: values.kategori,
        pertanyaan: values.pertanyaan,
        pembahasan: values.pembahasan,
        isFigural: values.isFigural,
        pilihan: formattedPilihan,
      };

      // 3. Masukkan figuralConfig jika mode figural diaktifkan
      if (values.isFigural && values.figuralTipe) {
        payload.figuralConfig = {
          tipe: values.figuralTipe,
          deretSoal: [], // Dikosongkan sesuai interface Drizzle
        };
      }

      // Kirim ke server action
      const result = await createQuestionAction(payload);

      if (!result.success) {
        setStatusMessage({ 
          type: "error", 
          text: result.error || "Gagal menyimpan soal ke database." 
        });
        return;
      }

      setStatusMessage({ 
        type: "success", 
        text: "Butir soal baru berhasil disimpan dengan aman!" 
      });
      
      reset({
        kategori: values.kategori,
        pertanyaan: "",
        pembahasan: "",
        isFigural: false,
        figuralTipe: null,
        pilihan: [...DEFAULT_OPTIONS] as any,
      });
      
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 text-foreground antialiased">
      
      {/* ATAS: NAVIGASI KEMBALI */}
      <div className="flex items-center gap-4">
        <Link 
          href={`/admin/packages`}
          className="p-2 border border-border bg-card rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tambah Soal Manual</h1>
          <p className="text-xs text-muted-foreground">Menyisipkan butir soal baru ke dalam manifes Volume {packageId}</p>
        </div>
      </div>

      {/* NOTIFIKASI STATUS FEEDBACK */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
            : "bg-destructive/10 border-destructive/20 text-destructive"
        }`}>
          {statusMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* BODY CONTAINER UTAMA FORMULIR */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* BLOK 1: KATEGORI & ISI PERTANYAAN */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Kategori Soal SKD</label>
            <select 
              {...register("kategori")}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="TWK">Tes Wawasan Kebangsaan (TWK)</option>
              <option value="TIU">Tes Inteligensia Umum (TIU)</option>
              <option value="TKP">Tes Karakteristik Pribadi (TKP)</option>
            </select>
            {errors.kategori && <p className="text-xs text-destructive font-medium">{errors.kategori.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Pertanyaan / Narasi Kasus</label>
            <textarea 
              {...register("pertanyaan")}
              rows={5}
              placeholder="Tuliskan narasi pertanyaan atau stimulus kasus di sini..."
              className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.pertanyaan && <p className="text-xs text-destructive font-medium">{errors.pertanyaan.message}</p>}
          </div>

          {/* TOGGLE MODE FIGURAL / GAMBAR */}
          <div className="pt-4 mt-2 border-t border-border flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                {...register("isFigural")}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600" /> Mode Gambar (Figural / Silogisme)
                </span>
                <span className="text-xs text-muted-foreground">Aktifkan untuk menyisipkan gambar prosedural di opsi A-E</span>
              </div>
            </label>

            {/* MUNCUL JIKA TOGGLE DICENTANG */}
            {isFiguralActive && (
              <div className="w-full sm:w-1/2">
                <select 
                  {...register("figuralTipe")}
                  className="w-full h-10 px-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="">-- Pilih Tipe Gambar --</option>
                  <option value="silogisme">Silogisme (Diagram Venn)</option>
                  <option value="deret_rotasi">Deret Rotasi</option>
                  <option value="matriks">Matriks Gambar</option>
                  <option value="pencerminan">Pencerminan</option>
                  <option value="analogi_gambar">Analogi Gambar</option>
                  <option value="analogi_matriks">Analogi Matriks</option>
                  <option value="ketidaksamaan">Ketidaksamaan</option>
                  <option value="deret_bangun">Deret Bangun</option>
                  <option value="tumpukan_balok">Tumpukan Balok 3D</option>
                </select>
                {errors.figuralTipe && <p className="text-xs text-destructive mt-1">{errors.figuralTipe.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* BLOK 2: DAFTAR OPSI LEMBAR JAWABAN (A-E) */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-bold">Pilihan Opsi & Distribusi Poin</h2>
            <p className="text-xs text-muted-foreground">Untuk TWK/TIU beri poin 5 pada opsi benar & 0 pada opsi salah. Untuk TKP beri skala poin 1-5.</p>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-start gap-3 p-3 bg-muted/30 border border-border/50 rounded-lg">
                <div className="w-9 h-9 flex items-center justify-center bg-muted border border-border rounded-lg text-xs font-bold shrink-0">
                  {field.opsi}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <input 
                    {...register(`pilihan.${index}.teks` as const)}
                    placeholder={`Teks pilihan jawaban untuk opsi ${field.opsi} (Opsional jika figural)...`}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  
                  {/* INPUT KHUSUS MUNCUL JIKA MODE FIGURAL AKTIF */}
                  {isFiguralActive && (
                    <input 
                      {...register(`pilihan.${index}.figuralAngle` as const)}
                      placeholder="Key Pola (misal: semua_dalam, huruf_e) atau Nilai Angka"
                      className="w-full h-9 px-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-purple-300"
                    />
                  )}

                  {errors.pilihan?.[index]?.teks && (
                    <p className="text-none text-[11px] text-destructive font-medium">{errors.pilihan[index]?.teks?.message}</p>
                  )}
                </div>

                <div className="w-full sm:w-24 space-y-1">
                  <input 
                    type="number"
                    {...register(`pilihan.${index}.poin` as const, { valueAsNumber: true })}
                    placeholder="Poin"
                    min={0}
                    max={5}
                    className="w-full h-9 px-2 text-center bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                  />
                  {errors.pilihan?.[index]?.poin && (
                    <p className="text-none text-[11px] text-destructive font-medium text-center">{errors.pilihan[index]?.poin?.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BLOK 3: TEKS PEMBAHASAN */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <label className="text-sm font-semibold">Materi Kunci Pembahasan</label>
          <textarea 
            {...register("pembahasan")}
            rows={4}
            placeholder="Tuliskan alasan rasionalisasi, pasal hukum pendukung, atau jalan pintas rumus pengerjaan di sini..."
            className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.pembahasan && <p className="text-xs text-destructive font-medium">{errors.pembahasan.message}</p>}
        </div>

        {/* TOMBOL AKSI SUBMIT */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Butir Soal
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}