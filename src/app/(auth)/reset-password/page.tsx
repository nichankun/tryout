"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/auth";

interface ResetProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default function ResetPasswordPage({ searchParams }: ResetProps) {
  const router = useRouter();
  
  // Unwrap searchParams secara asinkron (Standar Next.js)
  const { token, email } = use(searchParams);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proteksi awal jika token atau email tidak ada di URL
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-md text-center max-w-md w-full border border-red-100 dark:border-red-950/30">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Tautan Tidak Valid</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tautan atur ulang kata sandi tidak lengkap atau sudah kedaluwarsa.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) {
      setError("Kata sandi baru dan konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Sisipkan data token & email dari URL secara tersembunyi ke dalam formData
    formData.append("token", token!);
    formData.append("email", email!);

    try {
      const result = await resetPasswordAction(formData);

      if (result?.error) {
        if (result.error === "token_expired") {
          setError("Tautan telah kedaluwarsa. Silakan minta tautan baru.");
        } else {
          setError("Gagal mengubah kata sandi. Tautan tidak valid atau sudah kedaluwarsa.");
        }
        return;
      }

      // Berhasil -> arahkan ke login dengan membawa info sukses
      router.push("/login?status=password_reset_success");
    } catch {
      setError("Terjadi gangguan koneksi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kata Sandi Baru</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Silakan buat kata sandi baru yang kuat untuk mengamankan akun kamu.</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Password Baru */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Kata Sandi Baru</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                required
                disabled={isLoading}
                className="h-11 rounded-xl pr-11"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Konfirmasi Kata Sandi Baru</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Ulangi kata sandi baru"
              required
              disabled={isLoading}
              className="h-11 rounded-xl"
              minLength={8}
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
                Memperbarui...
              </>
            ) : (
              "Simpan Kata Sandi Baru"
            )}
          </Button>
        </form>

      </div>
    </div>
  );
}