"use client";

/**
 * app/admin/packages/[id]/add-question/page.tsx
 * * Client Component Formulir Manual Pembuatan Soal Baru.
 * Form soal teks dan gambar yang diunggah admin.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuestionAction, type CreateQuestionInput } from "@/lib/actions/questions";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { QuestionImageUpload } from "@/components/admin/question-image-upload";

// ==========================================
// SCHEMAS VALIDASI FORM (SISI CLIENT)
// ==========================================
const FormQuestionSchema = z.object({
  kategori: z.enum(["TWK", "TIU", "TKP"], {
    errorMap: () => ({ message: "Silakan pilih salah satu kategori materi" }),
  }),
  pertanyaan: z.string().min(10, "Pertanyaan minimal berisi 10 karakter"),
  pembahasan: z.string().min(10, "Pembahasan jawaban minimal berisi 10 karakter"),
  
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().max(300, "Deskripsi gambar maksimal 300 karakter").nullable().optional(),

  pilihan: z.array(
    z.object({
      opsi: z.enum(["A", "B", "C", "D", "E"]),
      teks: z.string().trim().max(500, "Teks opsi maksimal 500 karakter").optional(),
      poin: z.number({ invalid_type_error: "Poin harus berupa angka" })
        .int()
        .min(0, "Poin minimal 0")
        .max(5, "Poin maksimal 5"),
      imageUrl: z.string().nullable().optional(),
      imageAlt: z.string().max(300, "Deskripsi gambar maksimal 300 karakter").nullable().optional(),
    })
  ).length(5).superRefine((choices, context) => {
    choices.forEach((choice, index) => {
      if (!choice.teks?.trim() && !choice.imageUrl) {
        context.addIssue({
          code: "custom",
          path: [index, "teks"],
          message: "Isi teks atau unggah gambar untuk pilihan ini.",
        });
      }
    });
  }),
});

type FormValues = z.infer<typeof FormQuestionSchema>;
type FormChoice = FormValues["pilihan"][number];

const DEFAULT_OPTIONS: FormChoice[] = [
  { opsi: "A", teks: "", poin: 0, imageUrl: null, imageAlt: null },
  { opsi: "B", teks: "", poin: 0, imageUrl: null, imageAlt: null },
  { opsi: "C", teks: "", poin: 0, imageUrl: null, imageAlt: null },
  { opsi: "D", teks: "", poin: 0, imageUrl: null, imageAlt: null },
  { opsi: "E", teks: "", poin: 0, imageUrl: null, imageAlt: null },
];

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function AddQuestionPage() {
  const params = useParams();
  const [isPending, setIsPending] = React.useTransition();
  const [pendingUploads, setPendingUploads] = React.useState(0);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const packageId = parseInt(params.id as string, 10);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormQuestionSchema),
    defaultValues: {
      kategori: "TWK",
      pertanyaan: "",
      imageUrl: null,
      imageAlt: null,
      pembahasan: "",
      pilihan: [...DEFAULT_OPTIONS],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "pilihan",
  });

  const imageUrl = useWatch({ control, name: "imageUrl" });
  const imageAlt = useWatch({ control, name: "imageAlt" });
  const watchedChoices = useWatch({ control, name: "pilihan" });

  const onSubmit = (values: FormValues) => {
    setStatusMessage(null);

    setIsPending(async () => {
      // 1. Normalisasi teks dan metadata gambar opsi.
      const formattedPilihan = values.pilihan.map((p) => ({
        opsi: p.opsi,
        teks: p.teks?.trim() || "",
        poin: p.poin,
        imageUrl: p.imageUrl || null,
        imageAlt: p.imageAlt?.trim() || null,
      }));

      const payload: CreateQuestionInput = {
        packageId,
        kategori: values.kategori,
        pertanyaan: values.pertanyaan,
        imageUrl: values.imageUrl || null,
        imageAlt: values.imageAlt?.trim() || null,
        pembahasan: values.pembahasan,
        pilihan: formattedPilihan,
      };

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
        imageUrl: null,
        imageAlt: null,
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

          <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)]">
            <div>
              <input type="hidden" {...register("imageUrl")} />
              <QuestionImageUpload
                packageId={packageId}
                label="Gambar soal (opsional)"
                value={imageUrl}
                altText={imageAlt}
                onChange={(value) => setValue("imageUrl", value, { shouldDirty: true })}
                onUploadingChange={(uploading) => setPendingUploads((count) => Math.max(0, count + (uploading ? 1 : -1)))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="question-image-alt" className="text-xs font-medium text-muted-foreground">
                Deskripsi gambar untuk aksesibilitas
              </label>
              <input
                id="question-image-alt"
                {...register("imageAlt")}
                maxLength={300}
                placeholder="Contoh: Deret lima bentuk yang berputar searah jarum jam"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.imageAlt && <p className="text-xs text-destructive">{errors.imageAlt.message}</p>}
            </div>
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
                    placeholder={`Teks pilihan ${field.opsi} (opsional jika memakai gambar)...`}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input type="hidden" {...register(`pilihan.${index}.imageUrl` as const)} />
                  <QuestionImageUpload
                    packageId={packageId}
                    label={`Gambar opsi ${field.opsi} (opsional)`}
                    value={watchedChoices?.[index]?.imageUrl}
                    altText={watchedChoices?.[index]?.imageAlt}
                    aspect="square"
                    onChange={(value) => setValue(`pilihan.${index}.imageUrl`, value, { shouldDirty: true, shouldValidate: true })}
                    onUploadingChange={(uploading) => setPendingUploads((count) => Math.max(0, count + (uploading ? 1 : -1)))}
                  />
                  <label className="block space-y-1">
                    <span className="text-[11px] text-muted-foreground">Deskripsi gambar opsi untuk aksesibilitas</span>
                    <input
                      {...register(`pilihan.${index}.imageAlt` as const)}
                      maxLength={300}
                      placeholder="Jelaskan isi gambar secara singkat"
                      className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>

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
            disabled={isPending || pendingUploads > 0}
            className="h-11 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || pendingUploads > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {pendingUploads > 0 ? "Menunggu unggahan gambar..." : "Menyimpan..."}
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
