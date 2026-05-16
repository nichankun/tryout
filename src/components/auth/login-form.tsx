"use client";

/**
 * components/auth/login-form.tsx — FIXED
 *
 * Perbaikan dari review:
 * [1] try/finally pada router.push() → isLoading tidak stuck permanen
 * [2] Error dari Server Action diwhitelist → tidak tampil pesan teknis
 * [3] <a href> diganti <Link> → client-side navigation + prefetch
 * [4] autoFocus diganti useRef + useEffect → lebih terkontrol
 */

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

interface LoginFormProps {
  callbackUrl: string;
}

// ✅ [FIX 2] Whitelist pesan error dari Server Action
// Jangan render result.error mentah — bisa berisi pesan teknis dari server
const SAFE_ERRORS: Record<string, string> = {
  invalid_credentials: "Email atau kata sandi salah. Coba lagi.",
  user_not_found: "Akun dengan email ini tidak ditemukan.",
  too_many_attempts: "Terlalu banyak percobaan. Tunggu beberapa menit.",
  account_disabled: "Akun kamu telah dinonaktifkan. Hubungi dukungan.",
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ [FIX 4] Focus terkontrol via useRef — lebih aman dari autoFocus
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginAction(formData);

      if (result?.error) {
        // ✅ [FIX 2] Whitelist — fallback ke pesan generic jika kode tidak dikenal
        setError(SAFE_ERRORS[result.error] ?? "Terjadi kesalahan. Silakan coba lagi.");
        return;
      }

      // ✅ [FIX 1] router.push di dalam try — jika gagal, finally tetap reset loading
      router.push(callbackUrl);
      router.refresh();

    } catch {
      // Tangkap error jaringan atau error tak terduga dari Server Action
      setError("Koneksi bermasalah. Periksa internet kamu dan coba lagi.");
    } finally {
      // ✅ [FIX 1] finally selalu jalan — isLoading tidak pernah stuck
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">

      {/* Error inline */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl"
        >
          {error}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          required
          autoComplete="email"
          disabled={isLoading}
          className="h-11 rounded-xl"
          // ✅ [FIX 4] autoFocus dihapus — diganti useRef + useEffect di atas
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            Kata Sandi
          </Label>
          {/* ✅ [FIX 3] <a> diganti <Link> — client-side navigation, tidak full reload */}
          <Link
            href="/lupa-password"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimal 8 karakter"
            required
            autoComplete="current-password"
            disabled={isLoading}
            className="h-11 rounded-xl pr-11"
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

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-11 rounded-xl font-bold"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            Memverifikasi...
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}