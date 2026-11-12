import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, Mail, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Profil — ASNPedia",
  description: "Informasi akun peserta ASNPedia.",
};

export default async function DashboardProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = session.user.name ?? "Pengguna";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-full bg-[#F7F5FC]">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header>
          <h1 className="text-2xl font-extrabold tracking-[-0.035em] text-purple-950 sm:text-[2.15rem] lg:text-[2rem]">
            Profil
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base lg:text-sm">
            Informasi akun yang digunakan untuk masuk ke ASNPedia.
          </p>
        </header>

        <Card className="rounded-2xl border border-purple-100 bg-white p-0 shadow-sm ring-0">
          <CardContent className="p-0">
            <div className="flex min-w-0 items-center gap-3 p-4 md:hidden">
              <Avatar className="size-12 shrink-0 border border-purple-100">
                <AvatarImage src={session.user.image ?? undefined} alt={`Profil ${name}`} />
                <AvatarFallback className="bg-purple-100 text-sm font-bold text-primary">{initials || "IH"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-bold text-purple-950">{name}</p>
                  <Badge className="h-5 rounded-full border-0 bg-purple-100 px-2 text-[10px] font-bold text-primary hover:bg-purple-100">
                    Peserta
                  </Badge>
                </div>
                {session.user.email ? (
                  <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Mail className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{session.user.email}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="hidden items-center gap-5 p-5 md:flex md:p-7">
              <Avatar className="size-16 border border-purple-100">
                <AvatarImage src={session.user.image ?? undefined} alt={`Profil ${name}`} />
                <AvatarFallback className="bg-purple-100 text-lg font-bold text-primary">{initials || "IH"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <UserRound className="size-4 text-primary" aria-hidden="true" />
                  Nama peserta
                </div>
                <p className="text-lg font-extrabold text-purple-950">{name}</p>
                {session.user.email ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4 text-primary" aria-hidden="true" />
                    {session.user.email}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-2 md:hidden" aria-labelledby="profile-account-actions">
          <h2 id="profile-account-actions" className="px-1 text-xs font-semibold text-muted-foreground">
            Akun
          </h2>
          <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="h-auto min-h-16 w-full justify-start gap-3 rounded-2xl px-4 py-3 text-left text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <LogOut className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Keluar akun</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Keluar dari akun ASNPedia ini.
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
