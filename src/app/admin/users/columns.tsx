"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: Date | null;
};

export const columns: ColumnDef<UserRow>[] = [

  {
    accessorKey: "name",
    header: "Nama Lengkap",
    cell: ({ row }) => <span className="font-semibold text-foreground">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "email",
    // Menambahkan fungsionalitas sortable (urutkan A-Z) pada Header Alamat Email
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="hover:bg-transparent p-0 font-semibold gap-1 text-foreground cursor-pointer"
      >
        Alamat Email
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
  },
  {
    accessorKey: "role",
    header: () => <div className="text-center">Hak Akses</div>,
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <div className="text-center">
          <Badge variant={role === "ADMIN" ? "default" : "outline"}>
            {role}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Tanggal Terdaftar</div>,
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | null;
      return (
        <div className="text-right text-muted-foreground text-xs">
          {date ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
        </div>
      );
    },
  },
];