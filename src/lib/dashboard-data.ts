import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { questions, tryoutHistories, tryoutPackages, userAccess } from "@/db/database/schema";
import { TIMER_CONFIG } from "@/types/tryout";

export async function getDashboardTryoutData(userId: string) {
  const [accessList, packages, questionCounts] = await Promise.all([
    db.query.userAccess.findMany({
      where: eq(userAccess.userId, userId),
      columns: { packageId: true },
    }),
    db.query.tryoutPackages.findMany({
      where: eq(tryoutPackages.isActive, true),
      orderBy: [asc(tryoutPackages.id)],
      columns: { id: true, title: true, price: true },
      with: {
        histories: {
          where: eq(tryoutHistories.userId, userId),
          orderBy: [desc(tryoutHistories.endTime)],
          limit: 1,
          columns: {
            id: true,
            totalSkor: true,
            isLolos: true,
            skorTwk: true,
            skorTiu: true,
            skorTkp: true,
            endTime: true,
          },
        },
      },
    }),
    db
      .select({ packageId: questions.packageId, total: count() })
      .from(questions)
      .groupBy(questions.packageId),
  ]);

  const unlockedIds = new Set(accessList.map((access) => access.packageId));
  const questionCountByPackage = new Map(questionCounts.map((item) => [item.packageId, item.total]));
  const durationMinutes = Math.round(TIMER_CONFIG.durationSeconds / 60);
  const volumes = packages
    .filter((pkg) => (questionCountByPackage.get(pkg.id) ?? 0) > 0)
    .map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      totalSoal: questionCountByPackage.get(pkg.id) ?? 0,
      durasiMenit: durationMinutes,
      harga: pkg.price,
      isUnlocked: unlockedIds.has(pkg.id),
      isAvailable: true,
      lastHistory: pkg.histories[0] ?? null,
    }));

  const recentHistory = volumes
    .flatMap((volume) =>
      volume.lastHistory
        ? [{ packageId: volume.id, packageTitle: volume.title, history: volume.lastHistory }]
        : [],
    )
    .sort((a, b) => b.history.endTime.getTime() - a.history.endTime.getTime())[0] ?? null;

  return {
    volumes,
    availableCount: volumes.length,
    unlockedCount: volumes.filter((volume) => volume.isUnlocked).length,
    durationMinutes,
    recentHistory,
  };
}
