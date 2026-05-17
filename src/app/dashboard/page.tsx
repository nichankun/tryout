import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { ExamTypeTabs } from "@/components/dashboard/exam-type-tabs";
import { BookOpen, Clock, Target, LogOut } from "lucide-react";
// ✅ PERBAIKAN 1: Ambil signOut langsung dari konfigurasi auth utama
import { signOut } from "@/auth"; 

export interface TryoutVolume {
  id: number;
  title: string;
  totalSoal: number;
  durasiMenit: number;
  harga: number;
  hargaAsli: number;
  isUnlocked: boolean;
  isAvailable: boolean;
}

function generateVolumes(): TryoutVolume[] {
  return Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    return {
      id,
      title: `SKD CPNS - Vol ${id}`,
      totalSoal: 110,
      durasiMenit: 100,
      harga: 15000,
      hargaAsli: 25000,
      isUnlocked: id <= 2,
      isAvailable: true,
    };
  });
}

const volumes = generateVolumes();

const stats = [
  { icon: BookOpen, label: "Total Soal", value: "2.200+" },
  { icon: Clock,    label: "Durasi / Paket", value: "100 Menit" },
  { icon: Target,   label: "Akurasi Kisi-kisi", value: "98%" },
];


export default function DashboardPage() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 min-h-screen">

      {/* ── NAVBAR ── */}
      <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-200 dark:shadow-blue-900">
                CP
              </div>
              <span className="text-lg font-bold tracking-tight">
                ASN<span className="text-blue-600">Pedia</span>
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Saldo
                </p>
                <p className="text-sm font-bold text-emerald-600">Rp45.000</p>
              </div>

              <Separator orientation="vertical" className="h-8 hidden sm:block" />

              {/* Pakai next/image + Avatar shadcn, bukan <img> biasa */}
              <Avatar className="h-9 w-9 border-2 border-slate-100 dark:border-slate-700">
                <AvatarImage
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Imam"
                  alt="Foto profil Imam"
                />
                <AvatarFallback>IM</AvatarFallback>
              </Avatar>

              {/* ✅ PERBAIKAN 2: Menggunakan Inline Server Action untuk logout aman via NextAuth */}
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
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-full transition-colors ml-1"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
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

          {/* Tab SKD/SKB dipisah ke Client Component — Server Component tetap pure */}
          <ExamTypeTabs />

          {/* Stats */}
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

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Daftar Tryout Volume 1–20
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Pilih volume yang ingin kamu kerjakan
            </p>
          </div>
        </div>

        {/* Grid & Search dipisah ke Client Component */}
        <TryoutGrid volumes={volumes} />

        <div className="mt-12 text-center">
          {/* Button dari shadcn/ui */}
          <Button variant="outline" size="lg" className="rounded-xl font-bold">
            Lihat Volume Lainnya
          </Button>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm">
            © 2026 ASNPedia · Dibuat dengan semangat untuk mencerdaskan calon
            abdi negara.
          </p>
        </div>
      </footer>
    </div>
  );
}