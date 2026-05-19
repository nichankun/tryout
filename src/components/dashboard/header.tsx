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
import { LayoutDashboard, LogOut, History } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground shadow-sm">
            {APP_CONFIG.shortName}
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
            <span className="text-primary">{APP_CONFIG.highlightName}</span>
          </span>
        </Link>

        {/* User Navigation Side */}
        <div className="flex items-center gap-4">
          
          {/* Info Nama Pengguna di Samping Avatar (Hanya Muncul di Layar Desktop) */}
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Halo,
            </p>
            <p className="max-w-32 truncate text-sm font-bold text-foreground">
              {userName}
            </p>
          </div>

          {/* INTEGRASI DROPDOWN MENU AVATAR SHADCN */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-9 w-9 border border-border cursor-pointer transition-opacity hover:opacity-90">
                <AvatarImage src={userImage} alt={`Profil ${userName}`} />
                <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            
            {/* Lebar dropdown disesuaikan, sejajar ke kanan (align="end") */}
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-md border-border" forceMount>
              {/* Header Informasi Akun Lengkap */}
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground truncate">{userName}</p>
                  {userEmail && (
                    <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />


              {/* Item Menu: Jalur Riwayat Global */}
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer px-2.5 py-2">
                <Link href="/dashboard/riwayat" className="flex items-center w-full">
                  <History className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-medium text-sm">Riwayat Tryout</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Item Menu Khusus: Keluar Menggunakan Server Action Form Trigger */}
              {/* text-destructive membuat teks berwarna merah khas shadcn untuk aksi sensitif */}
              <DropdownMenuItem 
                className="rounded-lg cursor-pointer px-0 py-0 focus:bg-destructive/10 focus:text-destructive text-destructive"
                asChild
              >
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                  className="w-full"
                >
                  <button type="submit" className="flex w-full items-center px-2.5 py-2 text-sm font-medium outline-none">
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