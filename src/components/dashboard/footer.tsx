// src/components/dashboard/footer.tsx
const APP_CONFIG = { name: "ASNPedia" };

export function DashboardFooter() {
  return (
    <footer className="border-t border-border/70 bg-background py-5">
      <div className="mx-auto px-4 text-center md:px-6">
        <p className="text-xs text-muted-foreground">
          © 2026 {APP_CONFIG.name} · Dibuat dengan semangat untuk mencerdaskan calon abdi negara.
        </p>
      </div>
    </footer>
  );
}
