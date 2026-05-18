/**
 * app/admin/packages/page.tsx
 */

import { db } from "@/db";
import { tryoutPackages, questions } from "@/db/database/schema";
import { eq, sql } from "drizzle-orm";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react"; // ✅ Menambahkan import ikon
import Link from "next/link"; // ✅ Menambahkan import Link

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  // Ambil seluruh daftar volume paket simulasi
  const packagesData = await db.select().from(tryoutPackages).orderBy(tryoutPackages.id);

  // Mengintegrasikan kalkulasi perhitungan jumlah soal yang terikat di tiap paket secara paralel
  const enrichedPackages = await Promise.all(
    packagesData.map(async (pkg) => {
      const [questionCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questions)
        .where(eq(questions.packageId, pkg.id));

      return {
        ...pkg,
        totalQuestions: questionCount?.count ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6 text-foreground">
      
      {/* HEADER DENGAN TOMBOL AKSI */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Soal & Paket</h1>
          <p className="text-sm text-muted-foreground">
            Manajemen volume kompilasi materi dan sebaran jumlah butir soal.
          </p>
        </div>
        
        {/* ✅ Tombol Baru Tambah Paket */}
        <Link
          href="/admin/packages/add"
          className="h-10 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 self-start sm:self-auto transition-opacity cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Paket Baru
        </Link>
      </div>

      {/* Render Data Table Dinamis Headless UI */}
      <DataTable 
        columns={columns} 
        data={enrichedPackages} 
        searchKey="title" 
        searchPlaceholder="Cari judul paket tryout..." 
      />
    </div>
  );
}