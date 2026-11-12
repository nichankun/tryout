"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  UserRound,
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logoutAction } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { id: "overview", title: "Ringkasan", href: "/dashboard", icon: LayoutDashboard },
  { id: "packages", title: "Paket tryout", href: "/dashboard/paket", icon: Package },
  { id: "history", title: "Riwayat", href: "/dashboard/riwayat", icon: History },
  { id: "profile", title: "Profil", href: "/dashboard/profil", icon: UserRound },
] as const;

type NavItemId = (typeof NAV_ITEMS)[number]["id"];

interface DashboardSidebarProps {
  userName: string;
  userEmail: string;
  userImage?: string | null;
}

function getActiveItem(pathname: string): NavItemId {
  if (pathname.startsWith("/dashboard/paket")) return "packages";
  if (pathname.startsWith("/dashboard/riwayat")) return "history";
  if (pathname.startsWith("/dashboard/profil")) return "profile";
  return "overview";
}

export function DashboardSidebar({ userName, userEmail, userImage }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const activeItem = getActiveItem(pathname);
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-sidebar-border"
      style={{
        "--sidebar": "#211633",
        "--sidebar-foreground": "#F8F5FF",
        "--sidebar-primary": "#7765D3",
        "--sidebar-primary-foreground": "#FFFFFF",
        "--sidebar-accent": "rgba(119, 101, 211, 0.36)",
        "--sidebar-accent-foreground": "#FFFFFF",
        "--sidebar-border": "rgba(255, 255, 255, 0.1)",
        "--sidebar-ring": "#9B89DB",
      } as React.CSSProperties}
    >
      <SidebarHeader className="px-4 pb-7 pt-6 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="ASNPedia"
              className="h-12 gap-3 rounded-xl px-1 text-white hover:bg-transparent hover:text-white active:bg-transparent"
            >
              <Link href="/dashboard" aria-label="ASNPedia, ringkasan dashboard">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black tracking-tight text-white shadow-lg shadow-black/15 group-data-[collapsible=icon]:size-8">
                  CP
                </span>
                <span className="text-xl font-extrabold tracking-tight group-data-[collapsible=icon]:hidden">
                  ASN<span className="text-purple-300">Pedia</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 group-data-[collapsible=icon]:hidden">
            Menu utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={activeItem === item.id}
                      className="h-12 gap-3 rounded-xl px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-purple-600/55 data-[active=true]:text-white data-[active=true]:shadow-sm"
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <Icon className="size-5 shrink-0 group-data-[collapsible=icon]:size-4" aria-hidden="true" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto px-3 pb-4 pt-3 group-data-[collapsible=icon]:px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton aria-label={`Menu akun ${userName}`} className="h-[60px] rounded-2xl border border-white/10 bg-white/5 px-3 text-white hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!">
              <Avatar className="size-10 border border-white/15 group-data-[collapsible=icon]:size-8">
                <AvatarImage src={userImage ?? undefined} alt={`Profil ${userName}`} />
                <AvatarFallback className="bg-purple-500/30 text-xs font-bold text-white">
                  {initials || "IH"}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-semibold">{userName}</span>
                <span className="block text-[11px] font-medium text-white/55 md:text-[10px]">Akun peserta</span>
              </span>
              <ChevronDown className="size-4 text-white/70 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60 rounded-xl border-purple-200 p-1.5 shadow-xl">
            {userEmail ? (
              <>
                <DropdownMenuLabel className="truncate px-2.5 py-2 font-normal">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-purple-100" />
              </>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer rounded-lg"
              onSelect={() => void logoutAction()}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar akun
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardMobileNav() {
  const pathname = usePathname();
  const activeItem = getActiveItem(pathname);
  const [pendingNavigation, setPendingNavigation] = useState<{
    fromPath: string;
    item: NavItemId;
  } | null>(null);
  const pendingItem = pendingNavigation?.fromPath === pathname ? pendingNavigation.item : null;

  return (
    <nav
      aria-label="Navigasi dashboard"
      className="fixed inset-x-0 bottom-0 z-50 h-[calc(4.5rem+env(safe-area-inset-bottom))] border-t border-purple-100 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(46,23,77,0.35)] backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden"
    >
      <div className="mx-auto flex h-full max-w-lg items-stretch justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = (pendingItem ?? activeItem) === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  item.href === pathname
                ) return;

                setPendingNavigation({ fromPath: pathname, item: item.id });
              }}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold touch-manipulation transition-[color,transform] duration-100 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span
                className={`flex min-w-14 items-center justify-center rounded-full px-4 py-1 transition-colors duration-100 ${isActive ? "bg-primary/10" : "active:bg-primary/10"}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
