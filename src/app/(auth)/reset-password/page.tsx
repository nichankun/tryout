"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resetPasswordAction } from "@/lib/actions/auth";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const ROUTES = {
  loginSuccess: "/login?status=password_reset_success",
} as const;

const PAGE_CONTENT = {
  title: "Kata Sandi Baru",
  subtitle: "Silakan buat kata sandi baru yang kuat untuk mengamankan akun kamu.",
  invalidTitle: "Tautan Tidak Valid",
  invalidDesc: "Tautan atur ulang kata sandi tidak lengkap atau sudah kedaluwarsa.",
  passwordLabel: "Kata Sandi Baru",
  passwordPlaceholder: "Minimal 8 karakter",
  confirmLabel: "Konfirmasi Kata Sandi Baru",
  confirmPlaceholder: "Ulangi kata sandi baru",
  submitDefault: "Simpan Kata Sandi Baru",
  submitLoading: "Memperbarui...",
} as const;

const MESSAGES = {
  errors: {
    token_expired: "Tautan telah kedaluwarsa. Silakan minta tautan baru.",
    invalid_token: "Gagal mengubah kata sandi. Tautan tidak valid atau sudah kedaluwarsa.",
    connection: "Terjadi gangguan koneksi. Silakan coba lagi.",
    default: "Terjadi kesalahan yang tidak terduga.",
  },
} as const;

// ==========================================
// SCHEMA VALIDASI ZOD
// ==========================================
const resetSchema = z
  .object({
    password: z.string().min(8, { message: "Kata sandi minimal 8 karakter." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata sandi dan konfirmasi tidak cocok.",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

// ==========================================
// TIPE PROPS
// ==========================================
interface ResetProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function ResetPasswordPage({ searchParams }: ResetProps) {
  const router = useRouter();
  const { token, email } = use(searchParams);

  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Proteksi Awal
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card p-8 rounded-2xl shadow-md text-center max-w-md w-full border border-destructive/20">
          <h1 className="text-xl font-bold text-destructive mb-2">{PAGE_CONTENT.invalidTitle}</h1>
          <p className="text-sm text-muted-foreground">{PAGE_CONTENT.invalidDesc}</p>
        </div>
      </div>
    );
  }

  async function onSubmit(values: ResetValues) {
    setGlobalError(null);

    const formData = new FormData();
    formData.append("password", values.password);
    formData.append("token", token!);
    formData.append("email", email!);

    try {
      const result = await resetPasswordAction(formData);

      if (result?.error) {
        if (result.error === "token_expired") {
          setGlobalError(MESSAGES.errors.token_expired);
        } else {
          setGlobalError(MESSAGES.errors.invalid_token);
        }
        return;
      }

      router.push(ROUTES.loginSuccess);
    } catch {
      setGlobalError(MESSAGES.errors.connection);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border space-y-6">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">{PAGE_CONTENT.title}</h1>
          <p className="text-sm text-muted-foreground">{PAGE_CONTENT.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          {/* PASSWORD BARU */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>
              {PAGE_CONTENT.passwordLabel}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={PAGE_CONTENT.passwordPlaceholder}
                disabled={isSubmitting}
                autoFocus
                aria-invalid={!!errors.password}
                className="h-11 rounded-xl pr-11"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* KONFIRMASI PASSWORD BARU */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-destructive" : ""}>
              {PAGE_CONTENT.confirmLabel}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={PAGE_CONTENT.confirmPlaceholder}
              disabled={isSubmitting}
              aria-invalid={!!errors.confirmPassword}
              className="h-11 rounded-xl"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {errors.confirmPassword.message}
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

      </div>
    </div>
  );
}