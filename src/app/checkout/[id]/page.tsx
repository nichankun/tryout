/**
 * app/checkout/[id]/page.tsx
 * 
 * Async Server Component untuk memproses halaman peninjauan belanja (Checkout).
 * Terintegrasi penuh dengan Drizzle ORM, skema userAccess, dan sesi NextAuth v5.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { tryoutPackages, userAccess } from "@/db/database/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";

// ==========================================
// KONSTANTA & KONFIGURASI (Bebas Hardcode)
// ==========================================
const APP_CONFIG = {
  name: "ASNPedia",
  locale: "id-ID",
  currency: "IDR",
  adminFee: 1000,
} as const;

const BENEFITS_LIST = [
  "110 Soal SKD (TWK, TIU, TKP) standar BKN terbaru",
  "Simulasi CAT persis dengan aslinya (Anti-Cheat & Timer)",
  "Pembahasan teks dan trik cepat menjawab",
  "Analisis statistik nilai dan peluang lolos passing grade",
  "Akses seumur hidup untuk volume ini",
] as const;

const ROUTES = {
  loginRedirect: (id: number) => `/login?callbackUrl=/checkout/${id}`,
  tryoutDashboard: (id: number) => `/tryout/${id}`,
  dashboard: "/dashboard",
} as const;

const TEXT_CONTENT = {
  metaTitleDefault: `Checkout — ${APP_CONFIG.name}`,
  metaTitlePkg: (title: string) => `Checkout: ${title} — ${APP_CONFIG.name}`,
  metaTitleFallback: (id: string) => `Checkout Tryout Vol. ${id} — ${APP_CONFIG.name}`,
  pageTitle: "Selesaikan Pembayaran",
  pageSubtitle: "Satu langkah lagi untuk mulai tryout kamu.",
  sectionDetail: "Detail Paket",
  sectionBenefits: "Yang kamu dapatkan:",
  summaryTitle: "Ringkasan Belanja",
  labelItemPrice: "Harga Paket",
  labelAdminFee: "Biaya Layanan",
  labelTotalPrice: "Total Pembayaran",
  footerDisclaimer: "Pembayaran aman & terenkripsi. Akses tryout terbuka otomatis setelah pembayaran berhasil.",
} as const;

// ── INTERFACES ──
interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

// Helper format representasi rupiah secara global
function formatMataUang(amount: number): string {
  return `Rp ${amount.toLocaleString(APP_CONFIG.locale)}`;
}

// ==========================================
// GENERATE METADATA DYNAMIC
// ==========================================
export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { id } = await params;
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId)) return { title: TEXT_CONTENT.metaTitleDefault };

  const pkg = await db.query.tryoutPackages.findFirst({
    where: eq(tryoutPackages.id, volumeId),
  });

  return {
    title: pkg
      ? TEXT_CONTENT.metaTitlePkg(pkg.title)
      : TEXT_CONTENT.metaTitleFallback(id),
  };
}

// ==========================================
// KOMPONEN UTAMA (SERVER COMPONENT)
// ==========================================
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;

  // ── 1. Validasi Parameter ID Paket Volume ──
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  // ── 2. Validasi Proteksi Keamanan Sesi Akun Pengguna ──
  const session = await auth();
  if (!session?.user?.id) redirect(ROUTES.loginRedirect(volumeId));

  // ── 3. Ambil Data Informasi Paket Aktif Langsung Dari DB ──
  const pkg = await db.query.tryoutPackages.findFirst({
    where: and(
      eq(tryoutPackages.id, volumeId),
      eq(tryoutPackages.isActive, true)
    ),
  });
  if (!pkg) notFound();

  // ── 4. Validasi Status Kepemilikan (Pencegahan Pembelian Ganda) ──
  const owned = await db.query.userAccess.findFirst({
    where: and(
      eq(userAccess.userId, session.user.id),
      eq(userAccess.packageId, volumeId)
    ),
  });
  if (owned) redirect(ROUTES.tryoutDashboard(volumeId));

  const totalPembayaran = pkg.price + APP_CONFIG.adminFee;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* BAR UTAMA NAVIGASI ATAS */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full text-muted-foreground hover:text-foreground">
            <Link href={ROUTES.dashboard} aria-label="Kembali ke dashboard">
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {TEXT_CONTENT.pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {TEXT_CONTENT.pageSubtitle}
            </p>
          </div>
        </div>

        {/* LAYOUT GRID UTAMA HALAMAN CHECKOUT */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* SISI KIRI: PANEL DETAIL PAKET & KOMPONEN FORMULIR TRANSAKSI */}
          <div className="md:col-span-3 space-y-6">
            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-2">
                    {TEXT_CONTENT.sectionDetail}
                  </h2>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="font-semibold text-primary">
                      {pkg.title}
                    </p>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/90">
                    {TEXT_CONTENT.sectionBenefits}
                  </h3>
                  <ul className="space-y-2">
                    {BENEFITS_LIST.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" aria-hidden />
                        <span className="leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Komponen Client untuk Penanganan SDK Gateway Pembayaran */}
            <CheckoutForm volumeId={volumeId} total={totalPembayaran} />
          </div>

          {/* SISI KANAN: RINGKASAN REKAPITULASI BIAYA BELANJA */}
          <div className="md:col-span-2">
            <Card className="rounded-2xl border-border bg-card shadow-sm sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-foreground">
                  {TEXT_CONTENT.summaryTitle}
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{TEXT_CONTENT.labelItemPrice}</span>
                    <span>{formatMataUang(pkg.price)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{TEXT_CONTENT.labelAdminFee}</span>
                    <span>{formatMataUang(APP_CONFIG.adminFee)}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between font-bold text-base text-foreground">
                    <span>{TEXT_CONTENT.labelTotalPrice}</span>
                    <span className="text-primary font-black">
                      {formatMataUang(totalPembayaran)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground/60 leading-relaxed italic">
                  {TEXT_CONTENT.footerDisclaimer}
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}