/**
 * app/(auth)/login/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  highlightName: "Pedia",
  shortName: "CP",
  title: "Selamat datang kembali",
  subtitle: "Masuk untuk melanjutkan latihan SKD kamu.",
  tagline: "Persiapan CPNS yang lebih cerdas, bukan lebih keras.",
  description: "Ribuan soal HOTS, simulasi CAT real-time, dan analisis nilai yang membantu kamu fokus pada kelemahan — bukan sekadar mengerjakan soal.",
} as const;

const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  register: "/register",
} as const;

const STATS_DATA = [
  { value: "2.200+", label: "Soal Latihan" },
  { value: "98%", label: "Akurasi Kisi-kisi" },
  { value: "10rb+", label: "Peserta Aktif" },
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau kata sandi salah. Coba lagi.",
  SessionExpired: "Sesi kamu telah berakhir. Silakan masuk kembali.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode lain.",
  Default: "Terjadi kesalahan. Silakan coba lagi.",
};

export const metadata: Metadata = {
  title: `Masuk — ${APP_CONFIG.name}`,
  description: `Masuk ke akun ${APP_CONFIG.name} kamu untuk mengakses tryout SKD CPNS.`,
};

// ==========================================
// TIPE PROPS
// ==========================================
interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;

  // Validasi callbackUrl — cegah Open Redirect Attack
  const safeCallbackUrl =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : ROUTES.dashboard;

  // Whitelist pesan error
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    // Menggunakan `bg-background` bawaan shadcn
    <div className="min-h-screen bg-background flex">
      
      {/* Panel Kiri: Branding (Menggunakan Primary Theme Shadcn) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-foreground/10 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-primary-foreground/10 rounded-full" />

        <Link href={ROUTES.home} className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 bg-primary-foreground/20 rounded-xl flex items-center justify-center text-primary-foreground font-black text-sm">
            {APP_CONFIG.shortName}
          </div>
          <span className="text-primary-foreground font-bold text-lg tracking-tight">
            {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
            <span className="text-primary-foreground/80">{APP_CONFIG.highlightName}</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-primary-foreground space-y-3">
            <p className="text-3xl font-bold leading-tight">
              {APP_CONFIG.tagline}
            </p>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              {APP_CONFIG.description}
            </p>
          </blockquote>

          <div className="grid grid-cols-3 gap-4">
            {STATS_DATA.map((stat) => (
              <div key={stat.label} className="bg-primary-foreground/10 rounded-xl p-3 text-center">
                <p className="text-primary-foreground font-bold text-xl">{stat.value}</p>
                <p className="text-primary-foreground/70 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel Kanan: Form Login */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <Link href={ROUTES.home} className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">
                {APP_CONFIG.shortName}
              </div>
              <span className="font-bold text-foreground">
                {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
                <span className="text-primary">{APP_CONFIG.highlightName}</span>
              </span>
            </Link>

            {/* Menggunakan text-foreground dan text-muted-foreground bawaan shadcn */}
            <h1 className="text-2xl font-bold text-foreground">
              {APP_CONFIG.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {APP_CONFIG.subtitle}
            </p>
          </div>

          {/* Pesan Error: Menggunakan komponen Alert standar shadcn */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Auth Components */}
          <OAuthButtons mode="login" />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              atau masuk dengan email
            </span>
            <Separator className="flex-1" />
          </div>

          <LoginForm callbackUrl={safeCallbackUrl} />

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              href={ROUTES.register}
              className="text-primary font-semibold hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}