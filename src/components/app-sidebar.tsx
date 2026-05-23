"use client";

/**
 * components/app-sidebar.tsx
 * * Client Component untuk Navigasi Utama (Sidebar) Panel Admin.
 * Menggunakan arsitektur shadcn/ui sidebar collapsible dengan token warna semantik,
 * aman dari logo terpotong, dan dilengkapi tombol logout yang adaptif di bagian footer.
 */

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  Settings, 
  ShieldCheck,
  LogOut // 👈 Ditambahkan untuk ikon keluar
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react"; // 👈 Helper NextAuth untuk memproses logout

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const BRAND_CONFIG = {
  titlePrefix: "Admin",
  titleSuffix: "Pedia",
  groupLabel: "Menu Utama",
  logoutLabel: "Keluar Akun", // 👈 Label tombol logout
  footerCopyright: `© ${new Date().getFullYear()} Admin Panel`,
} as const;

const ADMIN_MENUS = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Manajemen User", url: "/admin/users", icon: Users },
  { title: "Bank Soal & Paket", url: "/admin/packages", icon: BookOpen },
  { title: "Transaksi", url: "/admin/orders", icon: CreditCard },
  { title: "Figural", url: "/admin/figural", icon: CreditCard },
  { title: "Pengaturan", url: "/admin/settings", icon: Settings },
] as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export function AppSidebar() {
  const pathname = usePathname();

  // Handler fungsi logout untuk membersihkan session cookie di server & client
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <Sidebar variant="inset" collapsible="icon">

      {/* ── HEADER: Logo dan Branding Korporat (FIXED - Tidak Terpotong) ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent active:bg-transparent cursor-default"
            >
              {/* Container Icon - Menggunakan aspect-square dan size-8 agar presisi saat collapsible=icon */}
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shrink-0">
                <ShieldCheck className="size-5" aria-hidden />
              </div>
              
              {/* Container Teks - Otomatis tersembunyi dengan rapi berkat selektor internal shadcn */}
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-base tracking-tight text-foreground">
                  {BRAND_CONFIG.titlePrefix}
                  <span className="text-primary">{BRAND_CONFIG.titleSuffix}</span>
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── CONTENT: Dinamis Navigasi Modul Menu Utama ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            {BRAND_CONFIG.groupLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_MENUS.map((item) => {
                const isCurrentRouteActive = pathname === item.url;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title} 
                      isActive={isCurrentRouteActive}
                      className="cursor-pointer transition-colors"
                    >
                      <Link href={item.url}>
                        <item.icon className="w-5 h-5" aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── FOOTER: Informasi Hak Cipta & Tombol Akses Keluar Akun ── */}
      <SidebarFooter className="p-2 border-t border-border gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={BRAND_CONFIG.logoutLabel}
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 cursor-pointer transition-colors w-full"
            >
              <LogOut className="w-5 h-5 shrink-0" aria-hidden />
              <span className="group-data-[collapsible=icon]:hidden font-medium">
                {BRAND_CONFIG.logoutLabel}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Teks hak cipta otomatis tersembunyi saat sidebar dalam mode ikon mini */}
        <p className="text-[10px] text-muted-foreground text-center truncate group-data-[collapsible=icon]:hidden px-2">
          {BRAND_CONFIG.footerCopyright}
        </p>
      </SidebarFooter>

    </Sidebar>
  );
}