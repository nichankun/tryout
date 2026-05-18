/**
 * app/dashboard/page.tsx
 *
 * ✅ Server Component — fetch data dari DB
 * ✅ Session real dari NextAuth v5
 * ✅ Volume unlocked dari tabel userAccess
 * ✅ Saldo dari tabel users (jika ada) atau bisa dari orders
 * ✅ Inline Server Action untuk logout
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { userAccess, tryoutPackages } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { ExamTypeTabs } from "@/components/dashboard/exam-type-tabs";
import { BookOpen, Clock, Target, LogOut } from "lucide-react";
import type { TryoutVolume } from "@/components/dashboard/tryout-grid";

export const metadata: Metadata = {
  title: "Dashboard — ASNPedia",
  description: "Pilih paket tryout SKD CPNS dan mulai latihan sekarang.",
};

const stats = [
  { icon: BookOpen, label: "Total Soal",       value: "2.200+" },
  { icon: Clock,    label: "Durasi / Paket",   value: "100 Menit" },
  { icon: Target,   label: "Akurasi Kisi-kisi", value: "98%" },
];

export default async function DashboardPage() {
  // ── 1. Cek session ───────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // ── 2. Fetch volume yang sudah dibeli user dari DB ───────────────────────
  const accessList = await db
    .select({ packageId: userAccess.packageId })
    .from(userAccess)
    .where(eq(userAccess.userId, userId));

  const unlockedIds = new Set(accessList.map((a) => a.packageId));

  // ── 3. Fetch semua paket aktif dari DB ───────────────────────────────────
  const packages = await db
    .select()
    .from(tryoutPackages)
    .where(eq(tryoutPackages.isActive, true));

  // ── 4. Gabungkan data paket dengan status unlocked ───────────────────────
  const volumes: TryoutVolume[] = packages.map((pkg) => ({
    id:          pkg.id,
    title:       pkg.title,
    totalSoal:   110,
    durasiMenit: 100,
    harga:       pkg.price,
    hargaAsli:   Math.round(pkg.price * 1.6), // diskon ~40%
    isUnlocked:  unlockedIds.has(pkg.id),
    isAvailable: true,
  }));

  // ── 5. Data user untuk navbar ────────────────────────────────────────────
  const userName  = session.user.name ?? "Pengguna";
  const userImage = session.user.image ?? undefined;
  const userInitials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen">

      {/* ── NAVBAR ── */}
      <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-200 dark:shadow-blue-900">
                CP
              </div>
              <span className="text-lg font-bold tracking-tight">
                ASN<span className="text-blue-600">Pedia</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Nama user dari session */}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Halo,
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-32">
                  {userName}
                </p>
              </div>

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              {/* Avatar dari session */}
              <Avatar className="h-9 w-9 border-2 border-slate-100 dark:border-slate-700">
                <AvatarImage src={userImage} alt={`Foto profil ${userName}`} />
                <AvatarFallback className="text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              {/* Riwayat */}
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex rounded-lg text-slate-500">
                <Link href="/riwayat">Riwayat</Link>
              </Button>

              {/* Logout via Inline Server Action */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" aria-hidden />
                  <span className="sr-only">Logout</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="bg-blue-600 dark:bg-blue-800 py-14 px-4">
        <div className="max-w-7xl mx-auto text-center text-white">
          <Badge
            variant="secondary"
            className="mb-4 bg-blue-500/40 text-blue-100 border-blue-400/40 hover:bg-blue-500/40"
          >
            CPNS 2026 · Soal HOTS Terbaru
          </Badge>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight tracking-tight">
            Siap Taklukkan Seleksi CPNS 2026?
          </h1>
          <p className="text-blue-100 max-w-xl mx-auto mb-8 text-base leading-relaxed">
            Latihan intensif dengan ribuan soal HOTS. Pilih paket tryout dan
            mulai simulasi CAT sekarang.
          </p>

          <ExamTypeTabs />

          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 text-blue-100">
                <Icon className="w-4 h-4 opacity-70" aria-hidden />
                <span className="text-sm font-medium">{value}</span>
                <span className="text-xs opacity-60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Daftar Tryout — {volumes.length} Volume
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {unlockedIds.size} volume sudah kamu miliki
            </p>
          </div>
        </div>

        <TryoutGrid volumes={volumes} />

        {volumes.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
            <p className="font-medium">Belum ada paket tryout tersedia.</p>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            © 2026 ASNPedia · Dibuat dengan semangat untuk mencerdaskan calon abdi negara.
          </p>
        </div>
      </footer>
    </div>
  );
}