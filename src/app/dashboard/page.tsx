import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { userAccess, tryoutPackages, tryoutHistories } from "@/db/database/schema";
import { eq, asc, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { ExamTypeTabs } from "@/components/dashboard/exam-type-tabs";
import { BookOpen, Clock, Target } from "lucide-react";

const STATS_DATA = [
  { icon: BookOpen, label: "Total Soal", value: "2.200+" },
  { icon: Clock, label: "Durasi / Paket", value: "100 Menit" },
  { icon: Target, label: "Akurasi Kisi-kisi", value: "98%" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [accessList, packagesWithHistories] = await Promise.all([
    db.query.userAccess.findMany({ where: eq(userAccess.userId, session.user.id), columns: { packageId: true } }),
    db.query.tryoutPackages.findMany({
      where: eq(tryoutPackages.isActive, true),
      orderBy: [asc(tryoutPackages.id)],
      with: { histories: { where: eq(tryoutHistories.userId, session.user.id), orderBy: [desc(tryoutHistories.endTime)] } }
    }),
  ]);

  const unlockedIds = new Set(accessList.map((a) => a.packageId));
  const volumes = packagesWithHistories.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    totalSoal: 110,
    durasiMenit: 100,
    harga: pkg.price,
    hargaAsli: Math.round(pkg.price * 1.6),
    isUnlocked: unlockedIds.has(pkg.id),
    isAvailable: true,
    lastHistory: pkg.histories[0] || null,
    totalPengerjaan: pkg.histories.length,
  }));

  return (
    <>
      <header className="bg-primary text-primary-foreground py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">CPNS 2026 · Soal HOTS Terbaru</Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight tracking-tight">Siap Taklukkan Seleksi CPNS 2026?</h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-base">Latihan intensif dengan ribuan soal HOTS. Pilih paket tryout dan mulai simulasi CAT sekarang.</p>
          <ExamTypeTabs />
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            {STATS_DATA.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-primary-foreground/90 text-sm">
                <s.icon className="w-4 h-4 opacity-70" />
                <span className="font-medium">{s.value}</span> <span className="opacity-60">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Daftar Tryout — {volumes.length} Volume</h2>
          <p className="text-sm text-muted-foreground">{unlockedIds.size} volume sudah kamu miliki</p>
        </div>
        <TryoutGrid volumes={volumes} />
      </main>
    </>
  );
}