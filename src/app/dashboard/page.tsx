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

  // Logika pengambilan data TETAP SAMA
  const [accessList, packagesWithHistories] = await Promise.all([
    db.query.userAccess.findMany({
      where: eq(userAccess.userId, session.user.id),
      columns: { packageId: true },
    }),
    db.query.tryoutPackages.findMany({
      where: eq(tryoutPackages.isActive, true),
      orderBy: [asc(tryoutPackages.id)],
      with: {
        histories: {
          where: eq(tryoutHistories.userId, session.user.id),
          orderBy: [desc(tryoutHistories.endTime)],
        },
      },
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
    // PERBAIKAN 1: Hapus min-h-screen agar tidak bentrok dengan layout.tsx, gunakan w-full
    <div className="flex w-full flex-1 flex-col bg-background">
      
      {/* Hero Section */}
      <section className="w-full border-b border-border bg-muted/40 py-12 md:py-16 lg:py-20">
        {/* PERBAIKAN 2: Kembalikan px-4 md:px-6 agar konten tidak menabrak / mepet kiri-kanan layar HP */}
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 text-center md:px-6">
          <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-sm font-medium">
            CPNS 2026 · Soal HOTS Terbaru
          </Badge>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Siap Taklukkan Seleksi CPNS 2026?
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground sm:text-lg sm:leading-8">
              Latihan intensif dengan ribuan soal HOTS. Pilih paket tryout dan
              mulai simulasi CAT sekarang untuk mengukur kemampuanmu.
            </p>
          </div>

          <div className="pt-4">
            <ExamTypeTabs />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 sm:gap-8">
            {STATS_DATA.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 text-sm sm:text-base"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold leading-none text-foreground">
                    {s.value}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Tryout Content */}
      {/* PERBAIKAN 3: Ubah tag <main> menjadi <div> karena <main> sudah ada di layout.tsx. Tambahkan kembali padding horizontal (px-4). */}
      <div className="container mx-auto flex-1 px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Daftar Tryout
            </h2>
            <p className="text-muted-foreground">
              {volumes.length} Volume tersedia · Kamu memiliki akses ke{" "}
              <span className="font-medium text-foreground">{unlockedIds.size} volume</span>
            </p>
          </div>

          <TryoutGrid volumes={volumes} />
        </div>
      </div>
    </div>
  );
}