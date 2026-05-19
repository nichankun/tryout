import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileX } from "lucide-react";

export default function TryoutNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <FileX className="w-7 h-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Soal Belum Tersedia</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Volume ini belum memiliki soal. Silakan pilih volume lain atau coba lagi nanti.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}