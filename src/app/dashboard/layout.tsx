import type { CSSProperties } from "react";
import { auth } from "@/auth";
import {
  DashboardMobileNav,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  const user = session?.user;

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        style={{ "--sidebar-width": "17.6rem" } as CSSProperties}
        className="bg-background"
      >
        <DashboardSidebar
          userName={user?.name ?? "Pengguna"}
          userEmail={user?.email ?? ""}
          userImage={user?.image}
        />
        <SidebarInset className="flex min-h-svh min-w-0 flex-col bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-foreground antialiased md:pb-0">
          <DashboardHeader />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
          <DashboardFooter />
        </SidebarInset>
        <DashboardMobileNav />
      </SidebarProvider>
    </TooltipProvider>
  );
}
