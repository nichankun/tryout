import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { adminAuditLogs } from "@/db/database/schema";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "package.created": "Membuat paket",
  "package.updated": "Mengubah paket",
  "package.deleted": "Menghapus paket",
  "question.created": "Menambahkan soal",
  "question.updated": "Mengubah soal",
  "question.deleted": "Menghapus soal",
  "question.imported": "Mengimpor soal",
  "question-image.uploaded": "Mengunggah gambar soal",
};

const TARGET_LABELS: Record<string, string> = {
  package: "Paket",
  question: "Soal",
};

const METADATA_LABELS: Record<string, string> = {
  title: "Judul",
  price: "Harga",
  isActive: "Aktif",
  packageId: "ID paket",
  category: "Kategori",
  count: "Jumlah soal",
};

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return "—";

  return Object.entries(metadata)
    .map(([key, value]) => {
      const label = METADATA_LABELS[key] ?? key;
      const displayValue = typeof value === "boolean" ? (value ? "Ya" : "Tidak") : String(value);
      return `${label}: ${displayValue}`;
    })
    .join(" · ");
}

export default async function AdminActivityPage() {
  const activity = await db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Log aktivitas admin</h1>
          <Badge variant="secondary">{activity.length} terbaru</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Catatan perubahan paket, bank soal, impor, dan unggahan gambar yang dilakukan admin.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {activity.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {entry.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.actorName}</div>
                        <div className="text-xs text-muted-foreground">{entry.actorEmail}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {TARGET_LABELS[entry.targetType] ?? entry.targetType} #{entry.targetId}
                      </TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {formatMetadata(entry.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <h2 className="font-semibold">Belum ada aktivitas tercatat</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perubahan admin akan muncul di sini setelah tabel audit database tersedia.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs leading-5 text-muted-foreground">
        Halaman ini hanya menampilkan 100 catatan terbaru. Log dibuat bersama transaksi perubahan paket dan soal agar perubahan yang gagal tidak tercatat sebagai berhasil.
      </p>
    </div>
  );
}
