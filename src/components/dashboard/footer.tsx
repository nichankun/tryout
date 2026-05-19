// src/components/dashboard/footer.tsx
const APP_CONFIG = { name: "ASNPedia" };

export function DashboardFooter() {
  return (
    <footer className="border-t bg-card py-8">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <p className="text-sm text-muted-foreground">
          © 2026 {APP_CONFIG.name} · Dibuat dengan semangat untuk mencerdaskan calon abdi negara.
        </p>
      </div>
    </footer>
  );
}