/**
 * app/(auth)/register/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RegisterForm } from "@/components/auth/register-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
} as const;

const ROUTES = {
  home: "/",
  login: "/login",
  terms: "/syarat-ketentuan",
  privacy: "/kebijakan-privasi",
} as const;

const PAGE_CONTENT = {
  metaDesc: `Buat akun ${APP_CONFIG.name} gratis dan mulai persiapan CPNS kamu.`,
  title: "Buat akun baru",
  subtitle: "Buat akun gratis dan mulai dari paket latihan yang tersedia.",
  brandingTitle: "Mulai persiapan SKD dengan langkah yang terarah.",
  brandingDesc: "Buat akun untuk menyimpan sesi latihan, meninjau hasil, dan melanjutkan persiapanmu kapan saja.",
  separatorText: "atau daftar dengan email",
  loginPrompt: "Sudah punya akun?",
  loginLink: "Masuk di sini",
} as const;

const BENEFITS_DATA = [
  "Pilih paket sesuai fokus latihanmu",
  "Kerjakan sesi dengan batas waktu",
  "Tinjau hasil dan pembahasan setelah sesi",
] as const;
const googleOAuthEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// ==========================================
// METADATA
// ==========================================
export const metadata: Metadata = {
  title: "Daftar",
  description: PAGE_CONTENT.metaDesc,
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function RegisterPage() {
  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <AuthSidePanel
        title={PAGE_CONTENT.brandingTitle}
        description={PAGE_CONTENT.brandingDesc}
        benefits={BENEFITS_DATA}
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
              {PAGE_CONTENT.title}
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              {PAGE_CONTENT.subtitle}
            </p>
          </div>

          <div className="mt-7">
            <OAuthButtons mode="register" callbackUrl="/auth/continue" enabled={googleOAuthEnabled} />
          </div>

          {googleOAuthEnabled && (
            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{PAGE_CONTENT.separatorText}</span>
              <Separator className="flex-1" />
            </div>
          )}

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {PAGE_CONTENT.loginPrompt}{" "}
            <Link
              href={ROUTES.login}
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              {PAGE_CONTENT.loginLink}
            </Link>
          </p>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link href={ROUTES.terms} className="font-semibold text-primary underline-offset-4 transition-colors hover:underline">
              Syarat & Ketentuan
            </Link>{" "}
            dan{" "}
            <Link href={ROUTES.privacy} className="font-semibold text-primary underline-offset-4 transition-colors hover:underline">
              Kebijakan Privasi
            </Link>{" "}
            {APP_CONFIG.name}.
          </p>
        </div>
      </section>
    </main>
  );
}
