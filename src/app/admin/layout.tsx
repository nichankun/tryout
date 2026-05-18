/**
 * app/admin/layout.tsx
 * 
 * Root Layout Server Component Khusus Panel Administrator.
 * Mengeksekusi proteksi ganda (Otentikasi Akun & Otorisasi Peran ADMIN) di level server,
 * menginisialisasi provider sidebar collapsible, serta menyediakan shell antarmuka yang konsisten.
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const STRATEGIC_ROUTES = {
  unauthenticatedRedirect: "/login",
  unauthorizedRedirect: "/dashboard",
} as const;

const ACCESS_CONTROL = {
  requiredRole: "ADMIN",
} as const;

interface AdminLayoutProps {
  children: React.ReactNode;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function AdminLayout({ children }: AdminLayoutProps) {
  
  // ── 1. PROTEKSI SEKURIOTAS SERVER-SIDE (NextAuth v5 Gate) ──
  const session = await auth();

  // A. Hadang jika token sesi tidak ditemukan
  if (!session?.user) {
    redirect(STRATEGIC_ROUTES.unauthenticatedRedirect);
  }

  // B. Hadang jika pengguna bukan entitas Administrator Resmi
  if (session.user.role !== ACCESS_CONTROL.requiredRole) {
    redirect(STRATEGIC_ROUTES.unauthorizedRedirect);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        
        {/* Panel Menu Navigasi Utama Sisi Samping */}
        <AppSidebar />

        {/* Kontainer Utama Selongsong Konten (Shell) */}
        <SidebarInset className="bg-background text-foreground antialiased flex flex-col min-h-screen">
          
          {/* ── 2. HEADER INTERFACES CONTROL (Sticky Top Navigation) ── */}
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 md:px-6 sticky top-0 z-10 shadow-sm transition-colors">
            {/* Tombol Pemicu Buka/Tutup Hambatan Sidebar */}
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </header>

          {/* ── 3. MAIN AREA WORKSPACE INJECTOR ── */}
          <main className="flex-1 p-4 md:p-6 bg-background min-h-[calc(100vh-4rem)]">
            <div className="max-w-7xl mx-auto w-full h-full">
              {children}
            </div>
          </main>
          
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}