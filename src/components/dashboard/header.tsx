// src/components/dashboard/header.tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, History } from "lucide-react";

const APP_CONFIG = { name: "ASNPedia", highlightName: "Pedia", shortName: "CP" };

export async function DashboardHeader() {
  const session = await auth();
  const userName = session?.user?.name ?? "Pengguna";
  const userEmail = session?.user?.email ?? "";
  const userImage = session?.user?.image ?? undefined;

  const userInitials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-200 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">

        {/* ── Brand Logo ── */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {/* Badge logo — ungu solid */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground shadow-sm">
            {APP_CONFIG.shortName}
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
            <span className="text-primary">{APP_CONFIG.highlightName}</span>
          </span>
        </Link>

        {/* ── Kanan: Nama + Avatar ── */}
        <div className="flex items-center gap-4">

          {/* Nama pengguna — desktop only */}
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Halo,
            </p>
            <p className="max-w-32 truncate text-sm font-bold text-foreground">
              {userName}
            </p>
          </div>

          {/* Avatar + Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <Avatar className="h-9 w-9 cursor-pointer border border-purple-200 transition-opacity hover:opacity-90">
                <AvatarImage src={userImage} alt={`Profil ${userName}`} />
                <AvatarFallback className="bg-purple-50 text-xs font-bold text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl border-purple-200 p-1 shadow-md"
              forceMount
            >
              {/* Info akun */}
              <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-semibold leading-none text-foreground">
                    {userName}
                  </p>
                  {userEmail && (
                    <p className="truncate text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-purple-200/40" />

              {/* Riwayat Tryout */}
              <DropdownMenuItem
                asChild
                className="cursor-pointer rounded-lg px-2.5 py-2 focus:bg-purple-50 focus:text-primary"
              >
                <Link href="/dashboard/riwayat" className="flex w-full items-center">
                  <History className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Riwayat Tryout</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-purple-200/40" />

              {/* Keluar */}
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-0 py-0 text-red-600 focus:bg-red-50 focus:text-red-600"
                asChild
              >
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="flex w-full items-center px-2.5 py-2 text-sm font-medium outline-none"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar Aplikasi</span>
                  </button>
                </form>
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
}