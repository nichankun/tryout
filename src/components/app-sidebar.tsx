"use client";

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
import { LayoutDashboard, Users, BookOpen, CreditCard, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminMenus = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Manajemen User", url: "/admin/users", icon: Users },
  { title: "Bank Soal & Paket", url: "/admin/packages", icon: BookOpen },
  { title: "Transaksi", url: "/admin/orders", icon: CreditCard },
  { title: "Pengaturan", url: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">

      {/* ── HEADER: Logo dan Branding ── */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 bg-blue-600 rounded-lg shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" aria-hidden />
          </div>
          <span className="font-bold text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden">
            Admin<span className="text-blue-600">Pedia</span>
          </span>
        </div>
      </SidebarHeader>

      {/* ── CONTENT: Daftar Navigasi Utama ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenus.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" aria-hidden />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── FOOTER: Info atau Akun ── */}
      <SidebarFooter className="p-4 border-t border-slate-200 dark:border-slate-800 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-slate-500 text-center truncate">
          © 2026 Admin Panel
        </p>
      </SidebarFooter>

    </Sidebar>
  );
}