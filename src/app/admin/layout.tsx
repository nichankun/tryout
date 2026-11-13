/**
 * app/admin/layout.tsx
 * 
 * Root Layout Server Component Khusus Panel Administrator.
 * Mengeksekusi proteksi ganda (Otentikasi Akun & Otorisasi Peran ADMIN) di level server,
 * menginisialisasi provider sidebar collapsible, serta menyediakan shell antarmuka yang konsisten.
 */

import type { Metadata } from "next";
import { requireAdminPageAccess } from "@/lib/authz";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
interface AdminLayoutProps {
  children: React.ReactNode;
}

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPageAccess();

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
