/**
 * app/admin/users/page.tsx
 */

import { db } from "@/db";
import { users } from "@/db/database/schema";
import { desc } from "drizzle-orm";
import { columns } from "./columns";
import { DataTable } from "@/components/admin/data-table";
import { requireAdminPageAccess } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdminPageAccess();

  // Batasi halaman admin pada 100 akun terbaru.
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
        <p className="text-sm text-muted-foreground">
          Menampilkan 100 akun terbaru. Data autentikasi tidak dikirim ke browser.
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
