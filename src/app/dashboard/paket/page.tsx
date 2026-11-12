import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { getDashboardTryoutData } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DashboardPackagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { availableCount, volumes } = await getDashboardTryoutData(session.user.id);

  return (
    <div className="min-h-full bg-[#F7F5FC]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-6 lg:px-8 lg:py-8 xl:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-purple-950 sm:text-[2.15rem] lg:text-[2rem]">
                Paket tryout
              </h1>
              <Badge className="h-6 rounded-full border-0 bg-purple-100 px-2.5 text-[10px] font-bold tracking-wide text-primary hover:bg-purple-100 sm:h-7 sm:px-3 sm:text-[11px]">
                {availableCount} paket tersedia
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base lg:text-sm">
              Pilih paket untuk melihat akses, jumlah soal, dan memulai simulasi SKD.
            </p>
          </div>
        </header>

        <TryoutGrid volumes={volumes} />
      </div>
    </div>
  );
}
