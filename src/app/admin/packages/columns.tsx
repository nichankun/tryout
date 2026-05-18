"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PackageRow = {
  id: number;
  title: string;
  price: number;
  totalQuestions: number;
  isActive: boolean | null;
};

export const columns: ColumnDef<PackageRow>[] = [
  {
    accessorKey: "id",
    header: "Volume ID",
    cell: ({ row }) => <span className="font-mono font-bold">Vol. {row.getValue("id")}</span>,
  },
  {
    accessorKey: "title",
    // Menambahkan fungsionalitas sortable (urutkan A-Z) pada Header
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hover:bg-transparent p-0 font-semibold gap-1 text-foreground cursor-pointer"
      >
        Judul Katalog Paket
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-semibold text-foreground">{row.getValue("title")}</span>,
  },
  {
    accessorKey: "price",
    header: "Tarif Harga",
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"));
      return <span className="font-medium text-foreground">Rp {price.toLocaleString("id-ID")}</span>;
    },
  },
  {
    accessorKey: "totalQuestions",
    header: "Kuantitas Soal",
    cell: ({ row }) => <span className="font-medium text-primary">{row.getValue("totalQuestions")} Butir</span>,
  },
  {
    accessorKey: "isActive",
    // Meratakan teks header dan sel ke kanan agar sejajar
    header: () => <div className="text-right">Status Pajang</div>,
    cell: ({ row }) => {
      const active = row.getValue("isActive") as boolean;
      return (
        <div className="text-right">
          <Badge variant={active ? "default" : "destructive"}>
            {active ? "AKTIF" : "NON-AKTIF"}
          </Badge>
        </div>
      );
    },
  },
];