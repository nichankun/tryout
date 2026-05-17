import { db } from "@/db";
import { users, verificationTokens } from "@/db/database/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface VerifyPageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  // ✅ Menangani searchParams secara asinkron sesuai standar Next.js 15/16
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <VerifyResult
        success={false}
        title="Tautan Tidak Valid"
        message="Tautan verifikasi email tidak lengkap atau tidak sah. Silakan periksa kembali kotak masuk email Anda."
      />
    );
  }

  try {
    // 1. Cari token verifikasi yang cocok di database
    const existingToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token)
      ),
    });

    if (!existingToken) {
      return (
        <VerifyResult
          success={false}
          title="Verifikasi Gagal"
          message="Tautan verifikasi salah, sudah digunakan, atau tidak terdaftar di sistem kami."
        />
      );
    }

    // 2. Periksa apakah token sudah kedaluwarsa (lebih dari 1 jam)
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      // Hapus token kedaluwarsa dari database agar bersih
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));

      return (
        <VerifyResult
          success={false}
          title="Tautan Kedaluwarsa"
          message="Tautan verifikasi ini telah kedaluwarsa karena sudah melewati batas waktu 1 jam. Silakan lakukan registrasi ulang."
        />
      );
    }

    // 3. Update kolom emailVerified pada user dengan waktu saat ini
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.email, email));

    // 4. Hapus token dari database karena proses verifikasi sudah selesai
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));

    return (
      <VerifyResult
        success={true}
        title="Verifikasi Berhasil"
        message="Email Anda telah berhasil diverifikasi! Akun Anda kini aktif dan Anda sudah bisa masuk ke platform ASNPedia."
      />
    );
  } catch (error) {
    console.error("Error pada verifikasi email:", error);
    return (
      <VerifyResult
        success={false}
        title="Terjadi Kesalahan"
        message="Terjadi gangguan internal pada server saat memproses verifikasi akun Anda. Silakan coba lagi beberapa saat lagi."
      />
    );
  }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Indikator Status (Icon) */}
        <div className="flex justify-center mb-6">
          {success ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          ) : (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-full text-red-600 dark:text-red-400">
              <XCircle className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Judul Status */}
        <h1 className={`text-2xl font-extrabold tracking-tight mb-3 ${success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {title}
        </h1>
        
        {/* Deskripsi/Pesan */}
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm leading-relaxed">
          {message}
        </p>

        {/* Tombol Aksi */}
        <Link href="/login" passHref>
          <Button className="w-full h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-none transition-all">
            Kembali ke Halaman Login
          </Button>
        </Link>
      </div>
    </div>
  );
}