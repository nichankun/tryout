"use client";

/**
 * app/admin/packages/[id]/add-question/page.tsx
 * * Client Component Formulir Manual Pembuatan Soal Baru.
 * Menggunakan React Hook Form + Zod Client Validation.
 * Otomatis memetakan 5 baris opsi permanen (A-E) dengan input bobot poin (0-5).
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuestionAction } from "@/lib/actions/questions";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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
  pilihan: z.array(
    z.object({
      opsi: z.enum(["A", "B", "C", "D", "E"]),
      teks: z.string().min(1, "Teks opsi jawaban tidak boleh kosong"),
      poin: z.number({ invalid_type_error: "Poin harus berupa angka" })
        .int()
        .min(0, "Poin minimal 0")
        .max(5, "Poin maksimal 5"),
    })
  ).length(5),
});

type FormValues = z.infer<typeof FormQuestionSchema>;

const DEFAULT_OPTIONS = [
  { opsi: "A", teks: "", poin: 0 },
  { opsi: "B", teks: "", poin: 0 },
  { opsi: "C", teks: "", poin: 0 },
  { opsi: "D", teks: "", poin: 0 },
  { opsi: "E", teks: "", poin: 0 },
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
      pilihan: [...DEFAULT_OPTIONS],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "pilihan",
  });

  const onSubmit = (values: FormValues) => {
    setStatusMessage(null);

    setIsPending(async () => {
      // PERBAIKAN: Menyisipkan isFigural: false agar kompatibel dengan validasi tipe data baru di Server Action
      const result = await createQuestionAction({
        packageId,
        isFigural: false, 
        ...values,
      });

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
        pilihan: [...DEFAULT_OPTIONS],
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
        </div>

        {/* BLOK 2: DAFTAR OPSI LEMBAR JAWABAN (A-E) */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-bold">Pilihan Opsi & Distribusi Poin</h2>
            <p className="text-xs text-muted-foreground">Untuk TWK/TIU beri poin 5 pada opsi benar & 0 pada opsi salah. Untuk TKP beri skala poin 1-5.</p>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-muted border border-border rounded-lg text-xs font-bold shrink-0 mt-0.5">
                  {field.opsi}
                </div>

                <div className="flex-1 space-y-1">
                  <input 
                    {...register(`pilihan.${index}.teks` as const)}
                    placeholder={`Teks pilihan jawaban untuk opsi ${field.opsi}...`}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.pilihan?.[index]?.teks && (
                    <p className="text-none text-[11px] text-destructive font-medium">{errors.pilihan[index]?.teks?.message}</p>
                  )}
                </div>

                <div className="w-20 space-y-1">
                  <input 
                    type="number"
                    {...register(`pilihan.${index}.poin` as const, { valueAsNumber: true })}
                    placeholder="Poin"
                    min={0}
                    max={5}
                    className="w-full h-9 px-2 text-center bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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