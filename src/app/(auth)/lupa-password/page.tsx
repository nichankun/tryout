"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { forgotPasswordAction } from "@/lib/actions/auth";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const ROUTES = {
  login: "/login",
} as const;

const PAGE_CONTENT = {
  title: "Lupa Kata Sandi?",
  subtitleDefault: "Masukkan email kamu yang terdaftar untuk mendapatkan tautan atur ulang kata sandi.",
  subtitleSuccess: "Kami telah mengirimkan instruksi pemulihan.",
  emailLabel: "Alamat Email",
  emailPlaceholder: "nama@email.com",
  submitDefault: "Kirim Tautan Atur Ulang",
  submitLoading: "Mengirim...",
  backToLogin: "Kembali ke Halaman Masuk",
} as const;

const MESSAGES = {
  successTitle: "Tautan berhasil dikirim!",
  successDesc: "Silakan periksa kotak masuk atau folder spam email kamu dalam beberapa menit ke depan.",
  errorFormat: "Terjadi kesalahan. Pastikan format email sudah benar.",
  errorConnection: "Koneksi bermasalah. Silakan periksa internet kamu dan coba lagi.",
} as const;

// ==========================================
// SCHEMA VALIDASI ZOD
// ==========================================
const forgotSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
});

type ForgotValues = z.infer<typeof forgotSchema>;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function LupaPasswordPage() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    setGlobalError(null);

    const formData = new FormData();
    formData.append("email", values.email);

    try {
      const result = await forgotPasswordAction(formData);
      if (result?.error) {
        setGlobalError(MESSAGES.errorFormat);
        return;
      }
      setIsSubmitted(true);
    } catch {
      setGlobalError(MESSAGES.errorConnection);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border space-y-6">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">
            {PAGE_CONTENT.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSubmitted ? PAGE_CONTENT.subtitleSuccess : PAGE_CONTENT.subtitleDefault}
          </p>
        </div>

        {isSubmitted ? (
          <Alert className="bg-teal-50 border-teal-200 text-teal-900">
            <CheckCircle2 className="h-4 w-4 stroke-teal-600" />
            <AlertTitle>{MESSAGES.successTitle}</AlertTitle>
            <AlertDescription className="text-xs opacity-90">
              {MESSAGES.successDesc}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {globalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{globalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>
                {PAGE_CONTENT.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={PAGE_CONTENT.emailPlaceholder}
                disabled={isSubmitting}
                autoFocus
                aria-invalid={!!errors.email}
                className="h-11 rounded-xl"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full h-11 rounded-xl font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {PAGE_CONTENT.submitLoading}
                </>
              ) : (
                PAGE_CONTENT.submitDefault
              )}
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link 
            href={ROUTES.login} 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {PAGE_CONTENT.backToLogin}
          </Link>
        </div>

      </div>
    </div>
  );
}
