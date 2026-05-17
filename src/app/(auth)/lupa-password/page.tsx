"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { forgotPasswordAction } from "@/lib/actions/auth";

export default function LupaPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await forgotPasswordAction(formData);
      if (result?.error) {
        setError("Terjadi kesalahan. Pastikan format email sudah benar.");
        return;
      }
      setIsSubmitted(true);
    } catch {
      setError("Koneksi bermasalah. Silakan periksa internet kamu dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Lupa Kata Sandi?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSubmitted 
              ? "Kami telah mengirimkan instruksi pemulihan." 
              : "Masukkan email kamu yang terdaftar untuk mendapatkan tautan atur ulang kata sandi."}
          </p>
        </div>

        {isSubmitted ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 text-sm p-4 rounded-xl text-center leading-relaxed font-medium">
            Tautan berhasil dikirim! Silakan periksa kotak masuk atau folder spam email kamu dalam beberapa menit ke depan.
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Alamat Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                required
                disabled={isLoading}
                className="h-11 rounded-xl"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Tautan Atur Ulang"
              )}
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Masuk
          </Link>
        </div>

      </div>
    </div>
  );
}