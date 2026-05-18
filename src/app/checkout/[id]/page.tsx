/**
 * app/checkout/[id]/page.tsx — OPTIMIZED
 *
 * Tidak ada hardcode:
 * - Nama paket, harga dari DB (tryoutPackages)
 * - Cek kepemilikan dari DB (userAccess)
 * - Session dari NextAuth v5
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

const ADMIN_FEE = 1000;

const BENEFITS = [
  "110 Soal SKD (TWK, TIU, TKP) standar BKN terbaru",
  "Simulasi CAT persis dengan aslinya (Anti-Cheat & Timer)",
  "Pembahasan teks dan trik cepat menjawab",
  "Analisis statistik nilai dan peluang lolos passing grade",
  "Akses seumur hidup untuk volume ini",
];

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { id } = await params;
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId)) return { title: "Checkout — ASNPedia" };

  const pkg = await db.query.tryoutPackages.findFirst({
    where: eq(tryoutPackages.id, volumeId),
  });

  return {
    title: pkg
      ? `Checkout: ${pkg.title} — ASNPedia`
      : `Checkout Tryout Vol. ${id} — ASNPedia`,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;

  // ── 1. Validasi id ────────────────────────────────────────────────────────
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1) notFound();

  // ── 2. Cek session ────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/checkout/${volumeId}`);

  // ── 3. Fetch paket dari DB ────────────────────────────────────────────────
  const pkg = await db.query.tryoutPackages.findFirst({
    where: and(
      eq(tryoutPackages.id, volumeId),
      eq(tryoutPackages.isActive, true)
    ),
  });
  if (!pkg) notFound();

  // ── 4. Cek apakah sudah dimiliki → redirect ke tryout ────────────────────
  const owned = await db.query.userAccess.findFirst({
    where: and(
      eq(userAccess.userId, session.user.id),
      eq(userAccess.packageId, volumeId)
    ),
  });
  if (owned) redirect(`/tryout/${volumeId}`);

  const total = pkg.price + ADMIN_FEE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/dashboard" aria-label="Kembali ke dashboard">
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Selesaikan Pembayaran
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Satu langkah lagi untuk mulai tryout kamu.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* Kiri */}
          <div className="md:col-span-3 space-y-6">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Detail Paket
                  </h2>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="font-semibold text-blue-700 dark:text-blue-300">
                      {pkg.title}
                    </p>
                    {pkg.description && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Yang kamu dapatkan:
                  </h3>
                  <ul className="space-y-2">
                    {BENEFITS.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" aria-hidden />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <CheckoutForm volumeId={volumeId} total={total} />
          </div>

          {/* Kanan: Ringkasan */}
          <div className="md:col-span-2">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Ringkasan Belanja
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Harga Paket</span>
                    <span>Rp {pkg.price.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Biaya Layanan</span>
                    <span>Rp {ADMIN_FEE.toLocaleString("id-ID")}</span>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="flex justify-between font-bold text-base text-slate-800 dark:text-slate-100">
                    <span>Total Pembayaran</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-center text-slate-400 leading-relaxed">
                  Pembayaran aman & terenkripsi. Akses tryout terbuka otomatis setelah pembayaran berhasil.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}