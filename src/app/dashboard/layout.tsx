// src/app/dashboard/layout.tsx
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Header Utama Dashboard */}
      <DashboardHeader />
      
      {/* Konten Halaman */}
      {/* Ditambahkan 'flex flex-col' agar halaman di dalamnya bisa mengadopsi full-height flex layouts dengan baik */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer Dashboard */}
      <DashboardFooter />
    </div>
  );
}