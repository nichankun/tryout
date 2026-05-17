"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { registerAction } from "@/lib/actions/auth";

const SAFE_ERRORS: Record<string, string> = {
  email_taken: "Email ini sudah digunakan. Coba masuk atau gunakan email lain.",
  weak_password: "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
  invalid_email: "Format email tidak valid.",
  too_many_attempts: "Terlalu banyak percobaan. Tunggu beberapa menit.",
};

export function RegisterForm() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Focus terkontrol — sama polanya dengan LoginForm
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(formData: FormData) {
    // ✅ Validasi confirm password di client sebelum hit server
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;
    if (password !== confirm) {
      setError("Kata sandi dan konfirmasi tidak cocok.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ✅ action="" diganti Server Action — sama polanya dengan LoginForm
      const result = await registerAction(formData);

      if (result?.error) {
        setError(SAFE_ERRORS[result.error] ?? "Terjadi kesalahan. Silakan coba lagi.");
        return;
      }

      // ✅ PERBAIKAN: Dialihkan ke halaman login dengan membawa parameter status
      // agar tidak terjadi konflik routing dengan Middleware NextAuth
      router.push("/login?status=verification_sent");
    } catch {
      setError("Koneksi bermasalah. Periksa internet kamu dan coba lagi.");
    } finally {
      // ✅ isLoading selalu di-reset via finally — tidak bisa stuck
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl"
        >
          {error}
        </div>
      )}

      {/* Nama Lengkap */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
        <Input
          ref={nameRef}
          id="name"
          name="name"
          placeholder="Budi Santoso"
          required
          autoComplete="name"
          disabled={isLoading}
          className="h-11 rounded-xl"
          minLength={2}
          maxLength={100}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
          autoComplete="email"
          disabled={isLoading}
          className="h-11 rounded-xl"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium">Kata Sandi</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimal 8 karakter"
            required
            autoComplete="new-password"
            disabled={isLoading}
            className="h-11 rounded-xl pr-11"
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition disabled:opacity-50"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword
              ? <EyeOff className="w-4 h-4" aria-hidden />
              : <Eye className="w-4 h-4" aria-hidden />
            }
          </button>
        </div>
      </div>

      {/* Konfirmasi Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Kata Sandi</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Ulangi kata sandi"
            required
            autoComplete="new-password"
            disabled={isLoading}
            className="h-11 rounded-xl pr-11"
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition disabled:opacity-50"
            aria-label={showConfirm ? "Sembunyikan konfirmasi" : "Tampilkan konfirmasi"}
          >
            {showConfirm
              ? <EyeOff className="w-4 h-4" aria-hidden />
              : <Eye className="w-4 h-4" aria-hidden />
            }
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl font-bold"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            Mendaftarkan...
          </>
        ) : (
          "Daftar Sekarang"
        )}
      </Button>
    </form>
  );
}