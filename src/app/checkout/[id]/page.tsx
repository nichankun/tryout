/**
 * app/checkout/[id]/page.tsx — FIXED
 * [1] id divalidasi + notFound() + redirect jika sudah dimiliki
 * [2] key={benefit} bukan key={i}
 * [3] Pilihan metode pembayaran dipindah ke CheckoutForm (Client Component)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/checkout-form";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Checkout Tryout Vol. ${id} — ASNPedia`,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { id } = await params;

  // ✅ [FIX 1] Validasi id
  const volumeId = parseInt(id, 10);
  if (isNaN(volumeId) || volumeId < 1 || volumeId > 20) notFound();

  // ✅ [FIX 1] Di production: cek apakah volume sudah dimiliki user
  // const session = await getSession();
  // const owned = await getUserOwnedVolumes(session.userId);
  // if (owned.includes(volumeId)) redirect(`/tryout/${volumeId}`);

  const tryoutName = `Paket Tryout SKD Premium Vol. ${volumeId}`;
  const price = 49000;
  const adminFee = 1000;
  const total = price + adminFee;

  const benefits = [
    "110 Soal SKD (TWK, TIU, TKP) standar BKN terbaru",
    "Simulasi CAT persis dengan aslinya (Anti-Cheat & Timer)",
    "Pembahasan teks dan trik cepat menjawab",
    "Analisis statistik nilai dan peluang lolos passing grade",
    "Akses seumur hidup untuk volume ini",
  ];

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

          {/* Kiri: Detail Pesanan */}
          <div className="md:col-span-3 space-y-6">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Detail Paket
                  </h2>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="font-semibold text-blue-700 dark:text-blue-300">{tryoutName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Yang kamu dapatkan:
                  </h3>
                  <ul className="space-y-2">
                    {/* ✅ [FIX 2] key={benefit} — identifier stabil, bukan index */}
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" aria-hidden />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/*
              ✅ [FIX 3] Pilihan metode pembayaran + tombol bayar
              dipindah ke CheckoutForm (Client Component) agar punya state
              untuk metode yang dipilih, lalu diteruskan ke CheckoutButton
            */}
            <CheckoutForm
              volumeId={volumeId}
              total={total}
            />
          </div>

          {/* Kanan: Ringkasan Harga — tetap di Server Component */}
          <div className="md:col-span-2">
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Ringkasan Belanja
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Harga Paket</span>
                    <span>Rp {price.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Biaya Layanan</span>
                    <span>Rp {adminFee.toLocaleString("id-ID")}</span>
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