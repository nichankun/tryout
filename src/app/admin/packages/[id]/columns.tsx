"use client";

/**
 * app/admin/packages/[id]/columns.tsx
 * * Definisi Matriks Kolom Data Table Manifes Daftar Soal Paket Tryout.
 * Terintegrasi dengan Server Action penghapusan otomatis dan navigasi edit.
 */

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { deleteQuestionAction } from "@/lib/actions/questions";
import Link from "next/link"; // ✅ Menambahkan import Link untuk navigasi internal Next.js
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Definisi tipe data baris soal berdasarkan skema database questions
export type QuestionRow = {
  id: number;
  kategori: "TWK" | "TIU" | "TKP";
  pertanyaan: string;
  pembahasan: string;
};

// ── SUB-KOMPONEN KHUSUS KHUSUS MENANGANI AKSI BARIS (Safe Hooks) ──
function RowActions({ question }: { question: QuestionRow }) {
  const params = useParams();
  const [isPending, startTransition] = React.useTransition();

  // Membaca ID paket tujuan langsung dari segmen rute URL aktif secara aman
  const rawId = typeof params.id === "string" ? params.id : "";
  const packageId = parseInt(rawId, 10) || 0;

  const handleDelete = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus butir soal ini secara permanen dari database?")) {
      startTransition(async () => {
        const result = await deleteQuestionAction(question.id, packageId);
        if (!result.success) {
          alert(result.error ?? "Gagal memproses hapus data.");
        }
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          disabled={isPending}
          className="h-8 w-8 p-0 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuLabel>Aksi Soal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Navigasi Trigger Edit */}
        {/* ✅ Menggunakan asChild dan mengarahkan href ke folder edit soal yang dinamis */}
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link href={`/admin/packages/${packageId}/edit/${question.id}`}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            Edit Soal
          </Link>
        </DropdownMenuItem>
        
        {/* Trigger Eksekusi Hapus Data */}
        <DropdownMenuItem 
          onClick={handleDelete}
          className="gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Soal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ==========================================
// KONFIGURASI MATRIKS KOLOM UTAMA
// ==========================================
export const columns: ColumnDef<QuestionRow>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hover:bg-transparent p-0 font-semibold gap-1 text-foreground cursor-pointer"
      >
        No / ID
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono text-xs font-bold text-muted-foreground">#{row.getValue("id")}</span>,
  },
  {
    accessorKey: "kategori",
    header: "Kategori",
    cell: ({ row }) => {
      const kategori = row.getValue("kategori") as "TWK" | "TIU" | "TKP";
      
      const badgeStyles = {
        TWK: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-blue-500/20",
        TIU: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/20",
        TKP: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20",
      };

      return (
        <Badge className={`font-bold border ${badgeStyles[kategori]}`}>
          {kategori}
        </Badge>
      );
    },
  },
  {
    accessorKey: "pertanyaan",
    header: "Butir Pertanyaan",
    cell: ({ row }) => {
      const teksPertanyaan = row.getValue("pertanyaan") as string;
      return (
        <span className="text-foreground font-medium line-clamp-2 max-w-md block" title={teksPertanyaan}>
          {teksPertanyaan}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Aksi</div>,
    cell: ({ row }) => <div className="text-right"><RowActions question={row.original} /></div>,
  },
];