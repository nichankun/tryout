"use client";

/**
 * components/auth/register-form.tsx
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { registerAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const ROUTES = {
  loginSuccess: "/login?status=verification_sent",
} as const;

const FORM_TEXT = {
  nameLabel: "Nama Lengkap",
  namePlaceholder: "Budi Santoso",
  emailLabel: "Email",
  emailPlaceholder: "nama@email.com",
  passwordLabel: "Kata Sandi",
  passwordPlaceholder: "Minimal 8 karakter",
  confirmLabel: "Konfirmasi Kata Sandi",
  confirmPlaceholder: "Ulangi kata sandi",
  submitDefault: "Daftar Sekarang",
  submitLoading: "Mendaftarkan...",
} as const;

const MESSAGES = {
  errors: {
    email_taken: "Email ini sudah digunakan. Coba masuk atau gunakan email lain.",
    weak_password: "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    invalid_email: "Format email tidak valid.",
    too_many_attempts: "Terlalu banyak percobaan. Tunggu beberapa menit.",
    connection: "Koneksi bermasalah. Periksa internet kamu dan coba lagi.",
    default: "Terjadi kesalahan. Silakan coba lagi.",
  },
} as const;

// ==========================================
// SCHEMA VALIDASI ZOD
// ==========================================
const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Nama minimal 2 karakter." })
      .max(100, { message: "Nama maksimal 100 karakter." }),
    email: z.string().email({ message: "Format email tidak valid." }),
    password: z
      .string()
      .min(8, { message: "Kata sandi minimal 8 karakter." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi dan konfirmasi tidak cocok.",
    path: ["confirmPassword"], // Error akan menempel di field confirmPassword
  });

type RegisterValues = z.infer<typeof registerSchema>;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function RegisterForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Inisialisasi RHF + Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setGlobalError(null);

    // Mapping nilai form ke FormData untuk Server Action
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("email", values.email);
    formData.append("password", values.password);
    formData.append("confirmPassword", values.confirmPassword);

    try {
      const result = await registerAction(formData);

      if (result?.error) {
        setGlobalError(
          MESSAGES.errors[result.error as keyof typeof MESSAGES.errors] ??
            MESSAGES.errors.default
        );
        return;
      }

      // Dialihkan ke halaman login dengan membawa parameter status
      router.push(ROUTES.loginSuccess);
    } catch {
      setGlobalError(MESSAGES.errors.connection);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      
      {/* PESAN ERROR GLOBAL */}
      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* INPUT NAMA */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>
          {FORM_TEXT.nameLabel}
        </Label>
        <Input
          id="name"
          type="text"
          placeholder={FORM_TEXT.namePlaceholder}
          autoComplete="name"
          disabled={isSubmitting}
          autoFocus
          aria-invalid={!!errors.name}
          className="h-11 rounded-xl"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

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

      {/* INPUT PASSWORD */}
      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className={errors.password ? "text-destructive" : ""}
        >
          {FORM_TEXT.passwordLabel}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={FORM_TEXT.passwordPlaceholder}
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            className="h-11 rounded-xl pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            aria-label={
              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
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

      {/* INPUT KONFIRMASI PASSWORD */}
      <div className="space-y-1.5">
        <Label
          htmlFor="confirmPassword"
          className={errors.confirmPassword ? "text-destructive" : ""}
        >
          {FORM_TEXT.confirmLabel}
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder={FORM_TEXT.confirmPlaceholder}
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.confirmPassword}
            className="h-11 rounded-xl pr-11"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            disabled={isSubmitting}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            aria-label={
              showConfirm
                ? "Sembunyikan konfirmasi"
                : "Tampilkan konfirmasi"
            }
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" aria-hidden />
            ) : (
              <Eye className="w-4 h-4" aria-hidden />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[0.8rem] font-medium text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* TOMBOL SUBMIT */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-xl font-bold"
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