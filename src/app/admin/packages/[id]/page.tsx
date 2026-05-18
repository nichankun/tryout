/**
 * app/admin/packages/[id]/page.tsx
 */

import { db } from "@/db";
import { tryoutPackages, questions } from "@/db/database/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Coins, UploadCloud } from "lucide-react";
import Link from "next/link";

interface AdminPackageDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminPackageDetailPage({ params }: AdminPackageDetailPageProps) {
  const resolvedParams = await params;
  const packageId = parseInt(resolvedParams.id, 10);

  // 1. Ambil detail paket tryout
  const [currentPackage] = await db
    .select()
    .from(tryoutPackages)
    .where(eq(tryoutPackages.id, packageId))
    .limit(1);

  // Jika ID paket tidak valid atau tidak ditemukan di database, lemparkan ke halaman 404 bawaan Next.js
  if (!currentPackage) {
    notFound();
  }

  // 2. Ambil semua daftar soal yang terikat dengan paket ini
  const questionsData = await db
    .select({
      id: questions.id,
      kategori: questions.kategori,
      pertanyaan: questions.pertanyaan,
      pembahasan: questions.pembahasan,
    })
    .from(questions)
    .where(eq(questions.packageId, packageId))
    .orderBy(desc(questions.id));

  return (
    <div className="space-y-8 text-foreground antialiased">
      
      {/* HEADER UTAMA & LINK ACTION TAMBAH SOAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{currentPackage.title}</h1>
            <Badge variant={currentPackage.isActive ? "default" : "destructive"}>
              {currentPackage.isActive ? "AKTIF" : "NON-AKTIF"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentPackage.description || "Tidak ada deskripsi untuk paket ini."}</p>
        </div>

        {/* Tombol pemicu navigasi aksi */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Tombol Import Massal */}
          <Link
            href={`/admin/packages/${packageId}/import`}
            className="h-10 px-4 border border-border bg-card text-foreground font-semibold rounded-xl text-sm shadow-sm hover:bg-muted flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Import Massal (.JSON)</span>
            <span className="sm:hidden">Import</span>
          </Link>

          {/* Tombol Tambah Manual */}
          <Link
            href={`/admin/packages/${packageId}/add-question`}
            className="h-10 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Soal Manual</span>
            <span className="sm:hidden">Manual</span>
          </Link>
        </div>
      </div>

      {/* MINI OVERVIEW METRIK CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Soal Terinput</p>
              <p className="text-xl font-bold">{questionsData.length} / 110 Butir</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Tarif Pendaftaran</p>
              <p className="text-xl font-bold">Rp {currentPackage.price.toLocaleString("id-ID")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DATA TABLE UTAMA MASTER LIST SOAL */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">Manifes Butir Soal</h2>
          <p className="text-xs text-muted-foreground">Daftar distribusi soal SKD yang tersimpan di dalam database volume ini.</p>
        </div>

        <DataTable 
          columns={columns} 
          data={questionsData} 
          searchKey="pertanyaan" 
          searchPlaceholder="Cari berdasarkan potongan teks pertanyaan..." 
        />
      </div>

    </div>
  );
}