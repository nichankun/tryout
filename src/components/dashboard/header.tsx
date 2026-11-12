import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 hidden w-full shrink-0 border-b border-purple-200/70 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/75 md:block">
      <div className="flex h-16 items-center gap-2 px-4">
        <SidebarTrigger
          className="size-10 shrink-0 rounded-xl text-muted-foreground hover:bg-purple-50 hover:text-primary"
          aria-label="Tampilkan atau sembunyikan navigasi"
          title="Tampilkan atau sembunyikan navigasi"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Ruang peserta
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            Latihan SKD CPNS
          </p>
        </div>
      </div>
    </header>
  );
}
