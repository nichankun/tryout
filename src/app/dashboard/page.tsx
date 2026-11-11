import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Clock3,
  FileText,
  KeyRound,
  Layers3,
} from "lucide-react";
import { auth } from "@/auth";
import { getDashboardTryoutData } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { availableCount, durationMinutes, recentHistory, unlockedCount } =
    await getDashboardTryoutData(session.user.id);
  const firstName = session.user.name?.trim().split(/\s+/)[0] || "Pengguna";

  const metrics = [
    {
      label: "Paket tersedia",
      value: String(availableCount),
      icon: Layers3,
      iconClass: "bg-purple-100 text-primary",
    },
    {
      label: "Akses aktif",
      value: String(unlockedCount),
      icon: KeyRound,
      iconClass: "bg-teal-100 text-teal-800",
    },
    {
      label: "Durasi simulasi",
      value: `${durationMinutes} menit`,
      icon: Clock3,
      iconClass: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="min-h-full bg-[#F7F5FC]">
      <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-6 sm:px-6 lg:gap-7 lg:px-8 lg:py-8 xl:px-10">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-purple-950 sm:text-[2.15rem]">
              Ruang belajar
            </h1>
            <Badge className="h-7 rounded-full border-0 bg-purple-100 px-3 text-[11px] font-bold tracking-wide text-primary hover:bg-purple-100">
              SKD CPNS
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xl font-bold tracking-tight text-purple-950 sm:text-2xl">Halo, {firstName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">Siap untuk sesi latihanmu?</p>
            </div>
            <p className="hidden text-xs font-semibold text-muted-foreground sm:block">
              Persiapanmu, dalam satu tempat
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Ringkasan akun">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className={`flex flex-row items-center gap-4 rounded-2xl border border-purple-100 bg-white px-4 py-4 shadow-[0_8px_26px_-20px_rgba(46,23,77,0.35)] ring-0 sm:px-5 sm:py-4 ${metric.label === "Durasi simulasi" ? "col-span-2 sm:col-span-1" : ""}`}>
                <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${metric.iconClass}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-muted-foreground sm:text-sm">{metric.label}</span>
                  <span className="mt-0.5 block truncate text-2xl font-extrabold tracking-tight text-purple-950 sm:text-[1.75rem]">
                    {metric.value}
                  </span>
                </span>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]" aria-label="Mulai latihan dan hasil terbaru">
          <Card className="relative min-h-[250px] rounded-[1.35rem] border border-purple-200/80 bg-[#F0EBFA] p-0 shadow-sm ring-0 sm:min-h-[278px]">
            <div className="absolute inset-y-0 right-0 w-[48%] overflow-hidden rounded-r-[1.35rem]">
              <Image
                src="/package-covers/progres.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 48vw, 500px"
                className="object-cover object-[65%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F0EBFA] via-[#F0EBFA]/55 to-transparent" aria-hidden="true" />
            </div>
            <CardContent className="relative flex min-h-[250px] items-center p-0 sm:min-h-[278px]">
              <div className="max-w-[72%] px-5 py-7 sm:max-w-[61%] sm:px-8">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Mulai dari sini</p>
                <CardTitle className="mt-3 text-[1.7rem] font-extrabold leading-tight tracking-tight text-purple-950 sm:text-3xl">
                  Mulai latihan
                </CardTitle>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
                  Pilih paket dan kerjakan simulasi pertamamu.
                </p>
                <Button asChild className="mt-5 h-11 rounded-xl px-4 font-bold shadow-md shadow-primary/20">
                  <Link href="/dashboard/paket">
                    Lihat paket tryout
                    <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-[250px] rounded-[1.35rem] border border-purple-100 bg-white p-0 shadow-sm ring-0 sm:min-h-[278px]">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-lg font-extrabold tracking-tight text-purple-950 sm:text-xl">Hasil latihan</CardTitle>
            </CardHeader>
            {recentHistory ? (
              <CardContent className="flex h-[190px] flex-col justify-center px-5 pb-5 sm:px-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Tryout terakhir · {recentHistory.packageTitle}</p>
                    <p className="mt-1 text-4xl font-extrabold tracking-tight text-purple-950">{recentHistory.history.totalSkor}</p>
                  </div>
                  <Badge className={recentHistory.history.isLolos ? "rounded-full bg-teal-100 text-teal-800 hover:bg-teal-100" : "rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100"}>
                    {recentHistory.history.isLolos ? "Target tercapai" : "Terus berlatih"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-purple-100 pt-3 text-xs">
                  {[
                    ["TWK", recentHistory.history.skorTwk],
                    ["TIU", recentHistory.history.skorTiu],
                    ["TKP", recentHistory.history.skorTkp],
                  ].map(([label, score]) => (
                    <span key={label} className="rounded-lg bg-[#F7F5FC] px-2.5 py-2 text-center">
                      <span className="block font-semibold text-muted-foreground">{label}</span>
                      <span className="mt-0.5 block font-extrabold text-purple-950">{score}</span>
                    </span>
                  ))}
                </div>
                <Link
                  href={`/dashboard/${recentHistory.packageId}/hasil?historyId=${recentHistory.history.id}`}
                  className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  Lihat hasil
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            ) : (
              <CardContent className="flex min-h-[190px] flex-col items-center justify-center px-5 pb-6 pt-2 text-center sm:px-6">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-300">
                  <FileText className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-3 text-base font-extrabold text-purple-950">Belum ada hasil</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground sm:text-sm">
                  Skor TWK, TIU, dan TKP muncul setelah tryout selesai.
                </p>
              </CardContent>
            )}
          </Card>
        </section>

      </div>
    </div>
  );
}
