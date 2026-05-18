/**
 * app/admin/settings/page.tsx
 * * Halaman Pengaturan Sistem Admin Panel (Server Component).
 * Menampilkan status sinkronisasi integrasi kredensial API (Environment Variables) 
 * dan parameter konfigurasi statis sistem seperti ambang batas kelulusan (Passing Grade).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const SETTINGS_CONFIG = {
  header: {
    title: "Pengaturan Sistem",
    description: "Konfigurasi parameter ambang batas kelulusan serta integrasi API.",
  },
  midtrans: {
    title: "Integrasi Payment Gateway",
    description: "Status sinkronisasi kredensial API Midtrans Core.",
    serverKeyText: "MIDTRANS_SERVER_KEY",
    clientKeyText: "MIDTRANS_CLIENT_KEY",
    envModeText: "Mode Lingkungan Midtrans",
    configured: "TERKONFIGURASI",
    missing: "KOSONG",
    liveMode: "PRODUCTION (LIVE)",
    sandboxMode: "SANDBOX (STAGING)",
  },
  passingGrade: {
    title: "Passing Grade SKD Resmi (BKN)",
    description: "Ambang kriteria penilaian kelulusan passing grade ujian CAT.",
    categories: [
      { name: "Tes Wawasan Kebangsaan (TWK)", minScore: 65 },
      { name: "Tes Inteligensia Umum (TIU)", minScore: 80 },
      { name: "Tes Karakteristik Pribadi (TKP)", minScore: 166 },
    ],
  },
} as const;

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default async function AdminSettingsPage() {
  // Melakukan pengecekan kesiapan kunci Environment Kredensial sistem secara berkala
  const midtransStatus = {
    serverKeyExist: !!process.env.MIDTRANS_SERVER_KEY,
    clientKeyExist: !!process.env.MIDTRANS_CLIENT_KEY,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  };

  return (
    <div className="space-y-6">
      
      {/* ── HEADER HALAMAN ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{SETTINGS_CONFIG.header.title}</h1>
        <p className="text-sm text-muted-foreground">{SETTINGS_CONFIG.header.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ── PANEL 1: CEK KONEKSI MIDTRANS ── */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{SETTINGS_CONFIG.midtrans.title}</CardTitle>
            <CardDescription>{SETTINGS_CONFIG.midtrans.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Status Server Key */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-medium">{SETTINGS_CONFIG.midtrans.serverKeyText}</span>
              {midtransStatus.serverKeyExist ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 gap-1.5 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> 
                  {SETTINGS_CONFIG.midtrans.configured}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1.5 py-0.5">
                  <XCircle className="w-3.5 h-3.5" aria-hidden /> 
                  {SETTINGS_CONFIG.midtrans.missing}
                </Badge>
              )}
            </div>

            {/* Status Client Key */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-medium">{SETTINGS_CONFIG.midtrans.clientKeyText}</span>
              {midtransStatus.clientKeyExist ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 gap-1.5 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> 
                  {SETTINGS_CONFIG.midtrans.configured}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1.5 py-0.5">
                  <XCircle className="w-3.5 h-3.5" aria-hidden /> 
                  {SETTINGS_CONFIG.midtrans.missing}
                </Badge>
              )}
            </div>

            {/* Status Environment Mode */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium">{SETTINGS_CONFIG.midtrans.envModeText}</span>
              <Badge variant={midtransStatus.isProduction ? "default" : "secondary"}>
                {midtransStatus.isProduction ? SETTINGS_CONFIG.midtrans.liveMode : SETTINGS_CONFIG.midtrans.sandboxMode}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── PANEL 2: RINGKASAN PASSING GRADE BKN ── */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{SETTINGS_CONFIG.passingGrade.title}</CardTitle>
            <CardDescription>{SETTINGS_CONFIG.passingGrade.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {/* Menggunakan metode mapping data array agar lebih modular */}
            {SETTINGS_CONFIG.passingGrade.categories.map((category) => (
              <div key={category.name} className="flex justify-between items-center text-sm">
                <span className="font-semibold">{category.name}</span>
                <span className="font-mono bg-muted px-2.5 py-1 rounded-md text-xs font-bold">
                  Min. {category.minScore} Poin
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}