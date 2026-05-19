// app/dashboard/layout.tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";

const APP_CONFIG = { name: "ASNPedia", highlightName: "Pedia", shortName: "CP" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userName = session?.user?.name ?? "Pengguna";
  const userImage = session?.user?.image ?? undefined;
  const userInitials = userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="bg-background font-sans text-foreground min-h-screen flex flex-col">
      {/* Navbar Lengkap */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-sm shadow-md">
                {APP_CONFIG.shortName}
              </div>
              <span className="text-lg font-bold tracking-tight">
                {APP_CONFIG.name.replace(APP_CONFIG.highlightName, "")}
                <span className="text-primary">{APP_CONFIG.highlightName}</span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Halo,</p>
                <p className="text-sm font-bold text-foreground truncate max-w-32">{userName}</p>
              </div>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <Avatar className="h-9 w-9 border-2 border-border">
                <AvatarImage src={userImage} alt="Profil" />
                <AvatarFallback className="text-xs font-bold">{userInitials}</AvatarFallback>
              </Avatar>
              
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <Button type="submit" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"><LogOut className="w-4 h-4" /></Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Konten Halaman */}
      <main className="grow">{children}</main>

      {/* Footer Lengkap */}
      <footer className="bg-card border-t border-border mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">© 2026 {APP_CONFIG.name} · Dibuat dengan semangat untuk mencerdaskan calon abdi negara.</p>
        </div>
      </footer>
    </div>
  );
}