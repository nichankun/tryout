/**
 * app/(auth)/login/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { appOrigin } from "@/lib/app-url";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  title: "Selamat datang kembali",
  subtitle: "Masuk untuk melanjutkan latihan SKD kamu.",
} as const;

const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  register: "/register",
} as const;

const AUTH_BENEFITS = [
  "Kerjakan sesi latihan berbatas waktu",
  "Tinjau ringkasan skor per kategori",
  "Pelajari pembahasan setelah sesi",
] as const;

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau kata sandi salah. Coba lagi.",
  SessionExpired: "Sesi kamu telah berakhir. Silakan masuk kembali.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode lain.",
  Default: "Terjadi kesalahan. Silakan coba lagi.",
};
const googleOAuthEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const metadata: Metadata = {
  title: "Masuk",
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

  let safeCallbackUrl: string = ROUTES.dashboard;
  if (callbackUrl) {
    try {
      const destination = new URL(callbackUrl, appOrigin);
      if (destination.origin === appOrigin) {
        safeCallbackUrl = `${destination.pathname}${destination.search}${destination.hash}`;
      }
    } catch {
      // Invalid destinations stay on the dashboard.
    }
  }

  // Whitelist pesan error
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
    : null;

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <AuthSidePanel
        title="Lanjutkan latihanmu dengan lebih terarah."
        description="Latihan berbatas waktu, ringkasan skor per kategori, dan pembahasan soal tersedia dalam satu tempat."
        benefits={AUTH_BENEFITS}
      />

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:bg-white lg:px-10">
        <div className="w-full max-w-md bg-transparent px-2 py-6 sm:rounded-[1.75rem] sm:border sm:border-purple-100 sm:bg-white sm:p-8 sm:shadow-xl sm:shadow-purple-950/5 lg:border-0 lg:bg-white lg:p-0 lg:shadow-none">
          <Link href={ROUTES.home} className="mb-8 inline-flex items-center gap-2.5 lg:hidden" aria-label="ASNPedia, beranda">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpenCheck className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-extrabold tracking-tight text-purple-950">ASN<span className="text-primary">Pedia</span></span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-purple-950">
              {APP_CONFIG.title}
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              {APP_CONFIG.subtitle}
            </p>
          </div>

          {/* Pesan Error: Menggunakan komponen Alert standar shadcn */}
          {errorMessage && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Auth Components */}
          <div className="mt-7">
          <OAuthButtons mode="login" callbackUrl="/auth/continue" enabled={googleOAuthEnabled} />
          </div>

          {googleOAuthEnabled && (
            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">atau masuk dengan email</span>
              <Separator className="flex-1" />
            </div>
          )}

          <LoginForm callbackUrl={safeCallbackUrl} />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              href={ROUTES.register}
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Daftar gratis
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
