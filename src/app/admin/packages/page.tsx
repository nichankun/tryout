/**
 * app/admin/packages/page.tsx
 */

import { db } from "@/db";
import { tryoutPackages, questions } from "@/db/database/schema";
import { count } from "drizzle-orm";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";
import { requireAdminPageAccess } from "@/lib/authz";
import { Plus } from "lucide-react"; // ✅ Menambahkan import ikon
import Link from "next/link"; // ✅ Menambahkan import Link

export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  await requireAdminPageAccess();

  // Ambil seluruh daftar volume paket simulasi
  const [packagesData, questionCounts] = await Promise.all([
    db.select().from(tryoutPackages).orderBy(tryoutPackages.id),
    db.select({ packageId: questions.packageId, total: count() }).from(questions).groupBy(questions.packageId),
  ]);
  const countByPackage = new Map(questionCounts.map((item) => [item.packageId, item.total]));
  const enrichedPackages = packagesData.map((pkg) => ({
    ...pkg,
    totalQuestions: countByPackage.get(pkg.id) ?? 0,
  }));

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
