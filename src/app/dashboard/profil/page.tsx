import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">Akun peserta</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-purple-950">Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">Informasi akun yang digunakan untuk masuk ke ASNPedia.</p>
        </div>

        <Card className="rounded-2xl border border-purple-100 bg-white p-0 shadow-sm ring-0">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
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
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="rounded-xl border-purple-200 bg-white">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Kembali ke ringkasan
          </Link>
        </Button>
      </div>
    </div>
  );
}
