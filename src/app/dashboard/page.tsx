import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { userAccess, tryoutPackages, tryoutHistories } from "@/db/database/schema";
import { eq, asc, desc } from "drizzle-orm";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { ExamTypeTabs } from "@/components/dashboard/exam-type-tabs";

// ==========================================
// DATA STATISTIK
// ==========================================

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    <div className="flex w-full flex-1 flex-col bg-background">

      {/* ==========================================
          HERO SECTION
      ========================================== */}
      <section className="relative w-full overflow-hidden border-b border-purple-200 bg-purple-50">

        {/* Dot pattern background */}
        <div className="absolute inset-0 -z-10 opacity-20 bg-[radial-gradient(var(--color-primary)_1px,transparent_1px)] bg-size-[20px_20px]" />

        <div className="container relative mx-auto flex flex-col items-center gap-6 px-4 py-14 text-center md:gap-8 md:py-20 md:px-6">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-100 animate-pulse" />
            CPNS 2026 · Soal HOTS Terbaru
          </div>

          {/* Heading */}
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-purple-900 dark:text-purple-800 sm:text-5xl md:text-6xl lg:text-7xl">
              Siap Taklukkan{" "}
              <br className="hidden sm:block" />
              <span className="text-purple-600">
                Seleksi CPNS 2026?
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-purple-800 dark:text-purple-600 sm:text-base md:text-lg md:leading-8">
              Latihan intensif dengan ribuan soal HOTS. Pilih paket tryout dan
              mulai simulasi CAT sekarang untuk mengukur kemampuanmu.
            </p>
          </div>

          {/* Exam type tabs */}
          <div>
            <ExamTypeTabs />
          </div>
          </div>
          
      </section>

      {/* ==========================================
          MAIN CONTENT — DAFTAR TRYOUT
      ========================================== */}
      <div className="container mx-auto flex-1 px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-col space-y-8">

          {/* Section header */}
          <div className="flex flex-col gap-1 border-l-4 border-primary pl-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Daftar Tryout
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              {volumes.length} volume tersedia &middot; Kamu memiliki akses ke{" "}
              <span className="font-bold text-primary">
                {unlockedIds.size} volume
              </span>
            </p>
          </div>

          {/* Grid kartu */}
          <TryoutGrid volumes={volumes} />
        </div>
      </div>
    </div>
  );
}