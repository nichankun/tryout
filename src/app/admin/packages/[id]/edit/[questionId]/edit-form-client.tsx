"use client";

/**
 * app/admin/packages/[id]/edit/[questionId]/edit-form-client.tsx
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateQuestionAction } from "@/lib/actions/questions";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const FormQuestionSchema = z.object({
  kategori: z.enum(["TWK", "TIU", "TKP"]),
  pertanyaan: z.string().min(10, "Pertanyaan minimal berisi 10 karakter"),
  pembahasan: z.string().min(10, "Pembahasan jawaban minimal berisi 10 karakter"),
  pilihan: z.array(
    z.object({
      opsi: z.enum(["A", "B", "C", "D", "E"]),
      teks: z.string().min(1, "Teks opsi jawaban tidak boleh kosong"),
      poin: z.number({ invalid_type_error: "Poin harus berupa angka" }).int().min(0).max(5),
    })
  ).length(5),
});

type FormValues = z.infer<typeof FormQuestionSchema>;

interface EditFormProps {
  // Ditambahkan properti opsional atau tegas isFigural dari database jika ada
  initialData: FormValues & { id: number; packageId: number; isFigural?: boolean };
}

export default function EditQuestionFormClient({ initialData }: EditFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useTransition();
  const [status, setStatus] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormQuestionSchema),
    defaultValues: {
      kategori: initialData.kategori,
      pertanyaan: initialData.pertanyaan,
      pembahasan: initialData.pembahasan,
      pilihan: initialData.pilihan,
    },
  });

  const { fields } = useFieldArray({ control, name: "pilihan" });

  const onSubmit = (values: FormValues) => {
    setStatus(null);
    setIsPending(async () => {
      // PERBAIKAN: Menyertakan isFigural agar lolos type-checking strict Server Action
      const result = await updateQuestionAction({
        id: initialData.id,
        packageId: initialData.packageId,
        isFigural: !!initialData.isFigural, // Mengunci nilai boolean asli dari database
        ...values,
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
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
          <div className="border-b border-border pb-2">
            <h2 className="text-sm font-bold">Pilihan Opsi & Distribusi Poin</h2>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-muted border border-border rounded-lg text-xs font-bold shrink-0 mt-0.5">{field.opsi}</div>
                <div className="flex-1 space-y-1">
                  <input {...register(`pilihan.${index}.teks` as const)} className="w-full h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  {errors.pilihan?.[index]?.teks && <p className="text-[11px] text-destructive font-medium">{errors.pilihan[index]?.teks?.message}</p>}
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
          <button type="submit" disabled={isPending} className="h-11 px-6 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-50">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </form>
    </div>
  );
}