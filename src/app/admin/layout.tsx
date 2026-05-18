import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="-ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100" />
          </header>

          <main className="flex-1 p-6 bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-4rem)]">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}