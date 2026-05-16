/**
 * app/(auth)/register/page.tsx
 *
 * ✅ Server Component dengan metadata
 * ✅ searchParams adalah Promise (Next.js 16)
 * ✅ Form dipisah ke Client Component RegisterForm
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { RegisterForm } from "@/components/auth/register-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Daftar — ASNPedia",
  description: "Buat akun ASNPedia gratis dan mulai persiapan CPNS kamu.",
};

export default async function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">

      {/* ── Panel Kiri: Branding ── */}
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
          <div className="space-y-3">
            <p className="text-3xl font-bold text-white leading-tight">
              Mulai perjalanan CPNS kamu hari ini.
            </p>
            <p className="text-blue-100 leading-relaxed">
              Daftar gratis dan langsung akses 2 paket tryout SKD tanpa perlu
              membayar. Tidak perlu kartu kredit.
            </p>
          </div>

          {/* Benefit list */}
          <ul className="space-y-3">
            {[
              "2 paket tryout gratis langsung setelah daftar",
              "Simulasi CAT persis seperti ujian BKN asli",
              "Analisis nilai TWK, TIU, dan TKP secara detail",
              "Pembahasan soal dengan penjelasan lengkap",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-blue-100">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                  ✓
                </span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Panel Kanan: Form Register ── */}
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
              Buat akun baru
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gratis selamanya untuk 2 paket tryout pertama.
            </p>
          </div>

          <OAuthButtons mode="register" />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              atau daftar dengan email
            </span>
            <Separator className="flex-1" />
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Masuk di sini
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link href="/syarat" className="underline hover:text-slate-600">
              Syarat & Ketentuan
            </Link>{" "}
            dan{" "}
            <Link href="/privasi" className="underline hover:text-slate-600">
              Kebijakan Privasi
            </Link>{" "}
            ASNPedia.
          </p>
        </div>
      </div>
    </div>
  );
}