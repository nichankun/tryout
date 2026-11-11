import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { TryoutGrid } from "@/components/dashboard/tryout-grid";
import { getDashboardTryoutData } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPackagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { availableCount, volumes } = await getDashboardTryoutData(session.user.id);

  return (
    <div className="min-h-full bg-[#F7F5FC]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-7 lg:px-8 lg:py-8 xl:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-purple-950 sm:text-[2.15rem]">
                Paket tryout
              </h1>
              <Badge className="h-7 rounded-full border-0 bg-purple-100 px-3 text-[11px] font-bold tracking-wide text-primary hover:bg-purple-100">
                {availableCount} paket tersedia
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Pilih paket untuk melihat akses, jumlah soal, dan memulai simulasi SKD.
            </p>
          </div>
          <Button asChild variant="outline" className="h-10 rounded-xl border-purple-200 bg-white font-semibold text-purple-900">
            <Link href="/dashboard/riwayat">
              Lihat riwayat
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        <TryoutGrid volumes={volumes} />
      </div>
    </div>
  );
}
