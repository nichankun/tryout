/**
 * app/admin/users/page.tsx
 */

import { db } from "@/db";
import { users } from "@/db/database/schema";
import { desc } from "drizzle-orm";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Mengambil daftar seluruh pengguna terurut dari yang terbaru didaftarkan
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
        <p className="text-sm text-muted-foreground">
          Daftar otorisasi kontrol akun pengguna dan administrator.
        </p>
      </div>

      {/* Render Data Table Dinamis Headless UI */}
      <DataTable 
        columns={columns} 
        data={allUsers} 
        searchKey="email" 
        searchPlaceholder="Cari berdasarkan email..." 
      />
    </div>
  );
}