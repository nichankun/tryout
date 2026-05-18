"use client";

/**
 * app/admin/packages/add/page.tsx
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPackageAction } from "@/lib/actions/packages";
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const FormPackageSchema = z.object({
  title: z.string().min(5, "Judul paket minimal berisi 5 karakter"),
  description: z.string().min(5, "Deskripsi minimal berisi 5 karakter"),
  price: z.number({ invalid_type_error: "Tarif wajib berupa angka" }).int().min(0),
});

type FormValues = z.infer<typeof FormPackageSchema>;

export default function AddPackagePage() {
  const router = useRouter();
  const [isPending, setIsPending] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormPackageSchema),
    defaultValues: { title: "", description: "", price: 0 },
  });

  const onSubmit = (values: FormValues) => {
    setErrorMsg(null);
    setIsPending(async () => {
      const result = await createPackageAction(values);
      if (!result.success) {
        setErrorMsg(result.error ?? "Gagal membuat paket.");
        return;
      }
      router.push("/admin/packages");
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 text-foreground antialiased">
      <div className="flex items-center gap-4">
        <Link href="/admin/packages" className="p-2 border border-border bg-card rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tambah Paket Tryout</h1>
          <p className="text-xs text-muted-foreground">Membuat volume bundel katalog baru untuk simulasi ujian.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border bg-destructive/10 border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Judul Katalog Paket</label>
          <input {...register("title")} placeholder="Contoh: Volume 01: Paket Perdana Premium" className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          {errors.title && <p className="text-xs text-destructive font-medium">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Deskripsi Singkat</label>
          <textarea {...register("description")} rows={3} placeholder="Tuliskan detail info isi paket tryout..." className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          {errors.description && <p className="text-xs text-destructive font-medium">{errors.description.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Nilai Jual Tarif (Rp)</label>
          <input type="number" {...register("price", { valueAsNumber: true })} className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          {errors.price && <p className="text-xs text-destructive font-medium">{errors.price.message}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPending} className="h-10 px-5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center gap-2 transition-opacity disabled:opacity-50 cursor-pointer">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4" /> Simpan Paket</>}
          </button>
        </div>
      </form>
    </div>
  );
}