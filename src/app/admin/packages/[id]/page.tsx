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
import { DeleteAllQuestionsButton } from "@/components/admin/delete-all-questions-button";
import { Plus, BookOpen, Coins, UploadCloud, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/authz";

interface AdminPackageDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminPackageDetailPage({ params }: AdminPackageDetailPageProps) {
  await requireAdminPageAccess();

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
      isFigural: questions.isFigural,
      imageUrl: questions.imageUrl,
    })
    .from(questions)
    .where(eq(questions.packageId, packageId))
    .orderBy(desc(questions.id));
  const legacyGeneratorCount = questionsData.filter((question) => question.isFigural && !question.imageUrl).length;

  return (
    <div className="space-y-8 text-foreground antialiased">
      
      {/* HEADER UTAMA & LINK ACTION TAMBAH SOAL */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{currentPackage.title}</h1>
            <Badge variant={currentPackage.isActive ? "default" : "destructive"}>
              {currentPackage.isActive ? "AKTIF" : "NON-AKTIF"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentPackage.description || "Tidak ada deskripsi untuk paket ini."}</p>
        </div>

        {/* Tombol pemicu navigasi aksi */}
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          {/* Tombol Import Massal */}
          <Link
            href={`/admin/packages/${packageId}/import`}
            className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="hidden sm:inline">Import Massal (.JSON)</span>
            <span className="sm:hidden">Import</span>
          </Link>

          {/* Tombol Tambah Manual */}
          <Link
            href={`/admin/packages/${packageId}/add-question`}
            className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tambah Soal Manual</span>
            <span className="sm:hidden">Manual</span>
          </Link>
          <DeleteAllQuestionsButton
            packageId={packageId}
            packageTitle={currentPackage.title}
            questionCount={questionsData.length}
          />
        </div>
      </div>

      {legacyGeneratorCount > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{legacyGeneratorCount} soal masih menggunakan generator lama.</p>
            <p className="text-sm">Buka dan edit soal tersebut untuk mengunggah gambar soal serta pilihan sebelum paket dikerjakan peserta.</p>
          </div>
        </div>
      )}

      {/* MINI OVERVIEW METRIK CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Soal Terinput</p>
              <p className="text-xl font-bold">{questionsData.length} Butir Soal</p>
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
