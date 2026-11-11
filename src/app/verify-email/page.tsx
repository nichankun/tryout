/**
 * app/verify-email/page.tsx
 */

import type { Metadata } from "next";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/database/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const ROUTES = {
  login: "/login",
} as const;

const VERIFY_CONTENT = {
  invalid: {
    title: "Tautan Tidak Valid",
    message: "Tautan verifikasi email tidak lengkap atau tidak sah. Silakan periksa kembali kotak masuk email Anda.",
  },
  notFound: {
    title: "Verifikasi Gagal",
    message: "Tautan verifikasi salah, sudah digunakan, atau tidak terdaftar di sistem kami.",
  },
  expired: {
    title: "Tautan Kedaluwarsa",
    message: "Tautan verifikasi ini telah kedaluwarsa. Coba masuk untuk meminta tautan verifikasi baru.",
  },
  success: {
    title: "Verifikasi Berhasil",
    message: "Email Anda telah berhasil diverifikasi! Akun Anda kini aktif dan Anda sudah bisa masuk ke platform ASNPedia.",
  },
  error: {
    title: "Terjadi Kesalahan",
    message: "Terjadi gangguan internal pada server saat memproses verifikasi akun Anda. Silakan coba lagi beberapa saat lagi.",
  },
  btnText: "Kembali ke Halaman Login",
} as const;

export const metadata: Metadata = {
  title: "Verifikasi email",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

// ==========================================
// TIPE PROPS
// ==========================================
interface VerifyPageProps {
  searchParams: Promise<{ token?: string; email?: string; status?: string; error?: string }>;
}

// ==========================================
// KOMPONEN UTAMA (SERVER)
// ==========================================
export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  // Menangani searchParams secara asinkron (Standar Next.js > 15)
  const { token, email, status, error } = await searchParams;

  if (status === "verified" && !error) {
    return <VerifyResult success title={VERIFY_CONTENT.success.title} message={VERIFY_CONTENT.success.message} />;
  }

  if (!token || !email) {
    return (
      <VerifyResult
        success={false}
        title={VERIFY_CONTENT.invalid.title}
        message={VERIFY_CONTENT.invalid.message}
      />
    );
  }

  let outcome: keyof typeof VERIFY_CONTENT;
  try {
    outcome = await db.transaction(async (tx) => {
      const [existingToken] = await tx
        .select()
        .from(verificationTokens)
        .where(and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token),
        ))
        .for("update");

      if (!existingToken) return "notFound";

      if (new Date(existingToken.expires) < new Date()) {
        await tx
          .delete(verificationTokens)
          .where(and(
            eq(verificationTokens.identifier, email),
            eq(verificationTokens.token, token),
          ));
        return "expired";
      }

      await tx
        .update(users)
        .set({ emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.email, email));

      await tx
        .delete(verificationTokens)
        .where(and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token),
        ));

      return "success";
    });
  } catch (error) {
    console.error("[Auth] Error pada verifikasi email:", error);
    outcome = "error";
  }

  const content = VERIFY_CONTENT[outcome];
  return <VerifyResult success={outcome === "success"} title={content.title} message={content.message} />;
}

// ──────────────────────────────────────────────────────────────────────────
// KOMPONEN UI HASIL VERIFIKASI
// ──────────────────────────────────────────────────────────────────────────
interface VerifyResultProps {
  success: boolean;
  title: string;
  message: string;
}

function VerifyResult({ success, title, message }: VerifyResultProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-border animate-in fade-in zoom-in-95 duration-300">
        
        {/* Indikator Status (Icon) */}
        <div className="flex justify-center mb-6">
          {success ? (
            <div className="p-3 bg-teal-50 rounded-full text-teal-600">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <XCircle className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Judul Status */}
        <h1 
          className={`text-2xl font-extrabold tracking-tight mb-3 ${
            success ? "text-teal-900" : "text-red-900"
          }`}
        >
          {title}
        </h1>
        
        {/* Deskripsi/Pesan */}
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {message}
        </p>

        {/* Tombol Aksi - Menggunakan asChild sesuai standar shadcn */}
        <Button asChild className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-purple-800">
          <Link href={ROUTES.login}>
            {VERIFY_CONTENT.btnText}
          </Link>
        </Button>
      </div>
    </div>
  );
}
