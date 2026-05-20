"use client";

/**
 * components/auth/login-form.tsx
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Gunakan Label standar
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const ROUTES = {
  admin: "/admin",
  dashboard: "/dashboard",
  forgotPassword: "/lupa-password",
} as const;

const API_ENDPOINTS = {
  session: "/api/auth/session",
} as const;

const FORM_TEXT = {
  emailLabel: "Email",
  emailPlaceholder: "nama@email.com",
  passwordLabel: "Kata Sandi",
  passwordPlaceholder: "Minimal 8 karakter",
  forgotPassword: "Lupa kata sandi?",
  submitDefault: "Masuk",
  submitLoading: "Memverifikasi...",
} as const;

const MESSAGES = {
  success: {
    verificationTitle: "Registrasi Berhasil!",
    verificationDesc: "Silakan periksa kotak masuk email kamu dan klik tautan verifikasi sebelum melakukan login.",
  },
  errors: {
    invalid_credentials: "Email atau kata sandi salah. Coba lagi.",
    user_not_found: "Akun dengan email ini tidak ditemukan.",
    too_many_attempts: "Terlalu banyak percobaan. Tunggu beberapa menit.",
    account_disabled: "Akun kamu telah dinonaktifkan. Hubungi dukungan.",
    email_not_verified: "Email kamu belum diverifikasi. Silakan periksa kotak masuk atau folder spam email kamu.",
    connection: "Koneksi bermasalah. Periksa internet kamu dan coba lagi.",
    default: "Terjadi kesalahan. Silakan coba lagi.",
  },
} as const;

// ==========================================
// SCHEMA VALIDASI ZOD
// ==========================================
const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(1, { message: "Kata sandi tidak boleh kosong." }),
});

type LoginValues = z.infer<typeof loginSchema>;

// ==========================================
// TIPE PROPS
// ==========================================
interface LoginFormProps {
  callbackUrl: string;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Inisialisasi React Hook Form murni
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setGlobalError(null);

    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);

    try {
      const result = await loginAction(formData);

      if (result?.error) {
        setGlobalError(MESSAGES.errors[result.error as keyof typeof MESSAGES.errors] ?? MESSAGES.errors.default);
        return;
      }

      // ── DETEKSI ROLE SECARA DINAMIS ──
      if (callbackUrl === ROUTES.dashboard) {
        try {
          const res = await fetch(API_ENDPOINTS.session);
          const session = await res.json();

          if (session?.user?.role === "ADMIN") {
            router.push(ROUTES.admin);
            router.refresh();
            return;
          }
        } catch (e) {
          console.error("Gagal memverifikasi role session:", e);
        }
      }

      router.push(callbackUrl);
      router.refresh();

    } catch {
      setGlobalError(MESSAGES.errors.connection);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      
      {/* BANNER INFORMASI VERIFIKASI */}
      {status === "verification_sent" && !globalError && (
        <Alert className="bg-teal-50 border-teal-200 text-teal-900">
          <CheckCircle2 className="h-4 w-4 stroke-teal-600" />
          <AlertTitle>{MESSAGES.success.verificationTitle}</AlertTitle>
          <AlertDescription className="text-xs opacity-90">
            {MESSAGES.success.verificationDesc}
          </AlertDescription>
        </Alert>
      )}

      {/* PESAN ERROR GLOBAL */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* INPUT EMAIL */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>
          {FORM_TEXT.emailLabel}
        </Label>
        <Input
          id="email"
          type="email"
          placeholder={FORM_TEXT.emailPlaceholder}
          autoComplete="email"
          disabled={isSubmitting}
          autoFocus
          aria-invalid={!!errors.email}
          className="h-11 rounded-xl"
          {...register("email")} // Mengikat input ke RHF
        />
        {errors.email && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* INPUT KATA SANDI */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>
            {FORM_TEXT.passwordLabel}
          </Label>
          <Link
            href={ROUTES.forgotPassword}
            className="text-xs text-primary hover:underline"
          >
            {FORM_TEXT.forgotPassword}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={FORM_TEXT.passwordPlaceholder}
            autoComplete="current-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            className="h-11 rounded-xl pr-11"
            {...register("password")} // Mengikat input ke RHF
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden />
            ) : (
              <Eye className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* TOMBOL SUBMIT */}
      <Button
        type="submit"
        className="w-full h-11 rounded-xl font-bold"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            {FORM_TEXT.submitLoading}
          </>
        ) : (
          FORM_TEXT.submitDefault
        )}
      </Button>
    </form>
  );
}