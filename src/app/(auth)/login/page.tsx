/**
 * app/(auth)/login/page.tsx  — FIXED
 *
 * Perbaikan dari review:
 * [1] mode prop konsisten: mode="login" bukan mode={"login"}
 * [2] callbackUrl divalidasi sebelum dipakai → cegah Open Redirect
 * [3] Error message diwhitelist → tidak tampilkan nilai raw dari URL
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Masuk — ASNPedia",
  description: "Masuk ke akun ASNPedia kamu untuk mengakses tryout SKD CPNS.",
};

// ✅ Whitelist error yang boleh ditampilkan — jangan render nilai raw dari URL
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau kata sandi salah. Coba lagi.",
  SessionExpired: "Sesi kamu telah berakhir. Silakan masuk kembali.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode lain.",
};

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;

  // ✅ [FIX 2] Validasi callbackUrl — cegah Open Redirect Attack
  // Hanya izinkan path lokal: dimulai "/" tapi bukan "//" (protocol-relative URL)
  const safeCallbackUrl =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/dashboard";

  // ✅ [FIX 3] Whitelist pesan error
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Terjadi kesalahan. Silakan coba lagi.")
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">

      {/* Panel Kiri: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 dark:bg-blue-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/30 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-blue-700/40 rounded-full" />

        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-sm">
            CP
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            ASN<span className="text-blue-200">Pedia</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-white space-y-3">
            <p className="text-3xl font-bold leading-tight">
              Persiapan CPNS yang lebih cerdas, bukan lebih keras.
            </p>
            <p className="text-blue-100 text-base leading-relaxed">
              Ribuan soal HOTS, simulasi CAT real-time, dan analisis nilai
              yang membantu kamu fokus pada kelemahan — bukan sekadar
              mengerjakan soal.
            </p>
          </blockquote>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "2.200+", label: "Soal Latihan" },
              { value: "98%",    label: "Akurasi Kisi-kisi" },
              { value: "10rb+",  label: "Peserta Aktif" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-xl">{s.value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Login */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">

          <div className="space-y-1">
            <Link href="/" className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
                CP
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                ASN<span className="text-blue-600">Pedia</span>
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Selamat datang kembali
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk melanjutkan latihan SKD kamu.
            </p>
          </div>

          {/* [FIX 3] Pesan error dari whitelist, bukan nilai raw URL */}
          {errorMessage && (
            <div
              role="alert"
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl"
            >
              {errorMessage}
            </div>
          )}

          {/* [FIX 1] mode="login" — string literal, tidak perlu kurung kurawal */}
          <OAuthButtons mode="login" />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              atau masuk dengan email
            </span>
            <Separator className="flex-1" />
          </div>

          {/* [FIX 2] safeCallbackUrl sudah divalidasi */}
          <LoginForm callbackUrl={safeCallbackUrl} />

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}