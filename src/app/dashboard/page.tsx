/**
 * app/dashboard/page.tsx
 * * Server Component Utama Dashboard Siswa.
 * Dioptimalkan dengan Concurrent Database Fetching (Promise.all)
 * dan Query Partial Selection untuk load time berkecepatan tinggi.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { userAccess, tryoutPackages } from "@/db/database/schema";
import { eq, asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { ExamTypeTabs } from "@/components/dashboard/exam-type-tabs";
import { BookOpen, Clock, Target, LogOut } from "lucide-react";
import type { TryoutVolume } from "@/components/dashboard/tryout-grid";

// ==========================================
// KONSTANTA & KONFIGURASI
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  highlightName: "Pedia",
  shortName: "CP",
  pricing: {
    discountMultiplier: 1.6, // Estimasi harga coret ~40%
    defaultTotalSoal: 110,
    defaultDurasi: 100,
  }
} as const;

const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  history: "/riwayat",
} as const;

const STATS_DATA = [
  { icon: BookOpen, label: "Total Soal",        value: "2.200+" },
  { icon: Clock,    label: "Durasi / Paket",   value: "100 Menit" },
  { icon: Target,   label: "Akurasi Kisi-kisi", value: "98%" },
] as const;

const HERO_CONTENT = {
  badge: "CPNS 2026 · Soal HOTS Terbaru",
  title: "Siap Taklukkan Seleksi CPNS 2026?",
  description: "Latihan intensif dengan ribuan soal HOTS. Pilih paket tryout dan mulai simulasi CAT sekarang.",
} as const;

export const metadata: Metadata = {
  title: `Dashboard — ${APP_CONFIG.name}`,
  description: "Pilih paket tryout SKD CPNS dan mulai latihan sekarang.",
};

// ==========================================
// KOMPONEN UTAMA (SERVER COMPONENT)
// ==========================================
export default async function DashboardPage() {
  // ── 1. Validasi Sesi Pengguna ──
  const session = await auth();
  if (!session?.user?.id) redirect(ROUTES.login);

  const userId = session.user.id;

  // ── 2. Concurrent Fetching (Optimasi Load Time) ──
  // Menarik Hak Akses User dan Daftar Paket Tryout secara bersamaan
  const [accessList, packages] = await Promise.all([
    // Ambil hanya packageId untuk meminimalkan beban bandwidth
    db.query.userAccess.findMany({
      where: eq(userAccess.userId, userId),
      columns: { packageId: true },
    }),
    
    // Ambil paket yang aktif dan hanya tarik kolom yang dipakai di UI
    db.query.tryoutPackages.findMany({
      where: eq(tryoutPackages.isActive, true),
      orderBy: [asc(tryoutPackages.id)],
      columns: {
        id: true,
        title: true,
        price: true,
      },
    }),
  ]);

  // Ekstrak ID paket yang sudah terbuka ke struktur Set (O(1) lookup time)
  const unlockedIds = new Set(accessList.map((a) => a.packageId));

  // ── 3. Transformasi Data Paket Menjadi Volume Grid ──
  const volumes: TryoutVolume[] = packages.map((pkg) => ({
    id:          pkg.id,
    title:       pkg.title,
    totalSoal:   APP_CONFIG.pricing.defaultTotalSoal,
    durasiMenit: APP_CONFIG.pricing.defaultDurasi,
    harga:       pkg.price,
    hargaAsli:   Math.round(pkg.price * APP_CONFIG.pricing.discountMultiplier),
    isUnlocked:  unlockedIds.has(pkg.id),
    isAvailable: true,
  }));

  // ── 4. Pengolahan Data Profil Ringkas User ──
  const userName  = session.user.name ?? "Pengguna";
  const userImage = session.user.image ?? undefined;
  const userInitials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-background font-sans text-foreground min-h-screen">

      {/* ── NAVBAR UTAMA ── */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo Brand */}
            <Link href={ROUTES.dashboard} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-sm shadow-md">
                {APP_CONFIG.shortName}
              </div>
              <span className="text-lg font-bold tracking-tight">
                {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
                <span className="text-primary">{APP_CONFIG.highlightName}</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Profil Singkat */}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Halo,
                </p>
                <p className="text-sm font-bold text-foreground truncate max-w-32">
                  {userName}
                </p>
              </div>

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              {/* Komponen Avatar */}
              <Avatar className="h-9 w-9 border-2 border-border">
                <AvatarImage src={userImage} alt={`Foto profil ${userName}`} />
                <AvatarFallback className="text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              {/* Menu Navigasi Riwayat Belajar */}
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex rounded-lg text-muted-foreground">
                <Link href={ROUTES.history}>Riwayat</Link>
              </Button>

              {/* Tombol Logout Instan via Inline Server Action */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: ROUTES.login });
                }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
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

      {/* ── HERO BANNER ── */}
      <header className="bg-primary text-primary-foreground py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
          >
            {HERO_CONTENT.badge}
          </Badge>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight tracking-tight">
            {HERO_CONTENT.title}
          </h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-base leading-relaxed">
            {HERO_CONTENT.description}
          </p>

          <ExamTypeTabs />

          {/* Bagian Statistik Ringkas */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {STATS_DATA.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 text-primary-foreground/90">
                <Icon className="w-4 h-4 opacity-70" aria-hidden />
                <span className="text-sm font-medium">{value}</span>
                <span className="text-xs opacity-60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── AREA KONTEN UTAMA ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Daftar Tryout — {volumes.length} Volume
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unlockedIds.size} volume sudah kamu miliki
            </p>
          </div>
        </div>

        {/* Grid Paket Komponen Client */}
        <TryoutGrid volumes={volumes} />

        {/* State Kosong (Fallback) */}
        {volumes.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" aria-hidden />
            <p className="font-medium">Belum ada paket tryout tersedia.</p>
          </div>
        )}
      </main>

      {/* ── FOOTER SISTEM ── */}
      <footer className="bg-card border-t border-border mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 {APP_CONFIG.name} · Dibuat dengan semangat untuk mencerdaskan calon abdi negara.
          </p>
        </div>
      </footer>
    </div>
  );
}