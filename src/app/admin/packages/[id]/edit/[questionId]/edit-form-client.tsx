"use client";

/**
 * app/admin/packages/[id]/edit/[questionId]/edit-form-client.tsx
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateQuestionAction } from "@/lib/actions/questions";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { QuestionImageUpload } from "@/components/admin/question-image-upload";

const FormQuestionSchema = z.object({
  kategori: z.enum(["TWK", "TIU", "TKP"]),
  pertanyaan: z.string().min(10, "Pertanyaan minimal berisi 10 karakter"),
  pembahasan: z.string().min(10, "Pembahasan jawaban minimal berisi 10 karakter"),
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().max(300, "Deskripsi gambar maksimal 300 karakter").nullable().optional(),
  pilihan: z.array(
    z.object({
      opsi: z.enum(["A", "B", "C", "D", "E"]),
      teks: z.string().trim().max(500, "Teks opsi maksimal 500 karakter").optional(),
      poin: z.number({ invalid_type_error: "Poin harus berupa angka" }).int().min(0).max(5),
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

interface EditFormProps {
  initialData: FormValues & {
    id: number;
    packageId: number;
    hasLegacyGeneratorData?: boolean;
  };
}

export default function EditQuestionFormClient({ initialData }: EditFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useTransition();
  const [pendingUploads, setPendingUploads] = React.useState(0);
  const [status, setStatus] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormQuestionSchema),
    defaultValues: {
      kategori: initialData.kategori,
      pertanyaan: initialData.pertanyaan,
      imageUrl: initialData.imageUrl,
      imageAlt: initialData.imageAlt,
      pembahasan: initialData.pembahasan,
      pilihan: initialData.pilihan,
    },
  });

  const { fields } = useFieldArray({ control, name: "pilihan" });
  const imageUrl = useWatch({ control, name: "imageUrl" });
  const imageAlt = useWatch({ control, name: "imageAlt" });
  const watchedChoices = useWatch({ control, name: "pilihan" });

  const onSubmit = (values: FormValues) => {
    setStatus(null);
    setIsPending(async () => {
      const result = await updateQuestionAction({
        id: initialData.id,
        packageId: initialData.packageId,
        imageUrl: values.imageUrl || null,
        imageAlt: values.imageAlt?.trim() || null,
        ...values,
        pilihan: values.pilihan.map((choice) => ({
          ...choice,
          teks: choice.teks?.trim() || "",
          imageUrl: choice.imageUrl || null,
          imageAlt: choice.imageAlt?.trim() || null,
        })),
      });

      if (!result.success) {
        setStatus({ type: "error", text: result.error ?? "Gagal memperbarui soal." });
        return;
      }

      setStatus({ type: "success", text: "Perubahan butir soal berhasil disimpan!" });
      
      setTimeout(() => {
        router.push(`/admin/packages/${initialData.packageId}`);
      }, 1000);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 text-foreground antialiased">
      <div className="flex items-center gap-4">
        <Link href={`/admin/packages/${initialData.packageId}`} className="p-2 border border-border bg-card rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Edit Butir Soal</h1>
          <p className="text-xs text-muted-foreground">Melakukan modifikasi data soal ID #{initialData.id}</p>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${status.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
          {status.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{status.text}</span>
        </div>
      )}

      {initialData.hasLegacyGeneratorData && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-sm">
            Soal ini masih memakai generator lama. Unggah gambar soal dan gambar pilihan yang sesuai sebelum menyimpan agar peserta tetap melihat materi dengan benar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Kategori Soal SKD</label>
            <select {...register("kategori")} className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              <option value="TWK">Tes Wawasan Kebangsaan (TWK)</option>
              <option value="TIU">Tes Inteligensia Umum (TIU)</option>
              <option value="TKP">Tes Karakteristik Pribadi (TKP)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Pertanyaan / Narasi Kasus</label>
            <textarea {...register("pertanyaan")} rows={5} className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            {errors.pertanyaan && <p className="text-xs text-destructive font-medium">{errors.pertanyaan.message}</p>}
          </div>
          <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1.25fr)_minmax(240px,0.75fr)]">
            <div>
              <input type="hidden" {...register("imageUrl")} />
              <QuestionImageUpload
                packageId={initialData.packageId}
                label="Gambar soal (opsional)"
                value={imageUrl}
                altText={imageAlt}
                onChange={(value) => setValue("imageUrl", value, { shouldDirty: true })}
                onUploadingChange={(uploading) => setPendingUploads((count) => Math.max(0, count + (uploading ? 1 : -1)))}
              />
            </div>
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Deskripsi gambar untuk aksesibilitas</span>
              <input
                {...register("imageAlt")}
                maxLength={300}
                placeholder="Deskripsikan isi gambar secara singkat"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.imageAlt && <p className="text-xs text-destructive">{errors.imageAlt.message}</p>}
            </label>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-bold">Pilihan Opsi & Distribusi Poin</h2>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-muted border border-border rounded-lg text-xs font-bold shrink-0 mt-0.5">{field.opsi}</div>
                <div className="flex-1 space-y-3">
                  <input
                    {...register(`pilihan.${index}.teks` as const)}
                    placeholder={`Teks pilihan ${field.opsi} (opsional jika memakai gambar)`}
                    className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {errors.pilihan?.[index]?.teks && <p className="text-[11px] text-destructive font-medium">{errors.pilihan[index]?.teks?.message}</p>}
                  <input type="hidden" {...register(`pilihan.${index}.imageUrl` as const)} />
                  <QuestionImageUpload
                    packageId={initialData.packageId}
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
                </div>
                <div className="w-20 space-y-1">
                  <input type="number" {...register(`pilihan.${index}.poin` as const, { valueAsNumber: true })} min={0} max={5} className="w-full h-9 px-2 text-center bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.pilihan?.[index]?.poin && <p className="text-[11px] text-destructive font-medium text-center">{errors.pilihan[index]?.poin?.message}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-sm">
          <label className="text-sm font-semibold">Materi Kunci Pembahasan</label>
          <textarea {...register("pembahasan")} rows={4} className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          {errors.pembahasan && <p className="text-xs text-destructive font-medium">{errors.pembahasan.message}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/admin/packages/${initialData.packageId}`} className="h-11 px-5 border border-border bg-card font-medium rounded-xl text-sm flex items-center justify-center hover:bg-muted transition-colors">Batal</Link>
          <button type="submit" disabled={isPending || pendingUploads > 0} className="h-11 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-50">
            {isPending || pendingUploads > 0 ? <><Loader2 className="w-4 h-4 animate-spin" /> {pendingUploads > 0 ? "Menunggu unggahan gambar..." : "Menyimpan..."}</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  );
}
