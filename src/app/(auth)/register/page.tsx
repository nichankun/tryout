/**
 * app/(auth)/register/page.tsx
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react"; // Menggunakan icon Lucide untuk checklist
import { Separator } from "@/components/ui/separator";
import { RegisterForm } from "@/components/auth/register-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  highlightName: "Pedia",
  shortName: "CP",
} as const;

const ROUTES = {
  home: "/",
  login: "/login",
  terms: "/syarat",
  privacy: "/privasi",
} as const;

const PAGE_CONTENT = {
  metaTitle: `Daftar — ${APP_CONFIG.name}`,
  metaDesc: `Buat akun ${APP_CONFIG.name} gratis dan mulai persiapan CPNS kamu.`,
  title: "Buat akun baru",
  subtitle: "Gratis selamanya untuk 2 paket tryout pertama.",
  brandingTitle: "Mulai perjalanan CPNS kamu hari ini.",
  brandingDesc: "Daftar gratis dan langsung akses 2 paket tryout SKD tanpa perlu membayar. Tidak perlu kartu kredit.",
  separatorText: "atau daftar dengan email",
  loginPrompt: "Sudah punya akun?",
  loginLink: "Masuk di sini",
} as const;

const BENEFITS_DATA = [
  "2 paket tryout gratis langsung setelah daftar",
  "Simulasi CAT persis seperti ujian BKN asli",
  "Analisis nilai TWK, TIU, dan TKP secara detail",
  "Pembahasan soal dengan penjelasan lengkap",
] as const;

// ==========================================
// METADATA
// ==========================================
export const metadata: Metadata = {
  title: PAGE_CONTENT.metaTitle,
  description: PAGE_CONTENT.metaDesc,
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function RegisterPage() {
  return (
    // Menggunakan bg-background bawaan shadcn
    <div className="min-h-screen bg-background flex">
      
      {/* ── Panel Kiri: Branding (Menggunakan Primary Theme) ── */}
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
          <div className="space-y-3">
            <p className="text-3xl font-bold text-primary-foreground leading-tight">
              {PAGE_CONTENT.brandingTitle}
            </p>
            <p className="text-primary-foreground/80 leading-relaxed">
              {PAGE_CONTENT.brandingDesc}
            </p>
          </div>

          {/* Benefit list */}
          <ul className="space-y-3">
            {BENEFITS_DATA.map((item) => (
              <li key={item} className="flex items-start gap-3 text-primary-foreground/90">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 text-primary-foreground">
                  <Check className="w-3 h-3" strokeWidth={3} />
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
            <Link href={ROUTES.home} className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xs">
                {APP_CONFIG.shortName}
              </div>
              <span className="font-bold text-foreground">
                {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
                <span className="text-primary">{APP_CONFIG.highlightName}</span>
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-foreground">
              {PAGE_CONTENT.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {PAGE_CONTENT.subtitle}
            </p>
          </div>

          <OAuthButtons mode="register" />

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {PAGE_CONTENT.separatorText}
            </span>
            <Separator className="flex-1" />
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-muted-foreground">
            {PAGE_CONTENT.loginPrompt}{" "}
            <Link
              href={ROUTES.login}
              className="text-primary font-semibold hover:underline"
            >
              {PAGE_CONTENT.loginLink}
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Dengan mendaftar, kamu menyetujui{" "}
            <Link href={ROUTES.terms} className="underline hover:text-foreground transition-colors">
              Syarat & Ketentuan
            </Link>{" "}
            dan{" "}
            <Link href={ROUTES.privacy} className="underline hover:text-foreground transition-colors">
              Kebijakan Privasi
            </Link>{" "}
            {APP_CONFIG.name}.
          </p>
        </div>
      </div>
    </div>
  );
}