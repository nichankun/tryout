"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type OrderRow = {
  id: string;
  customerEmail: string;
  packageName: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "partially_refunded" | "refunded" | "disputed";
  paidAt: Date | null;
  refundAmount: number;
  duplicatePayment: boolean;
  reconciliationRequired: boolean;
};

export const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "id",
    header: "Order ID",
    cell: ({ row }) => <span className="font-mono text-xs font-bold bg-muted/60 px-2 py-1 rounded-md">{row.getValue("id")}</span>,
  },
  {
    accessorKey: "customerEmail",
    header: "Email Pembeli",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("customerEmail")}</span>,
  },
  {
    accessorKey: "packageName",
    header: "Paket",
    cell: ({ row }) => <span className="text-muted-foreground text-sm truncate max-w-37.5 block">{row.getValue("packageName")}</span>,
  },
  {
    accessorKey: "amount",
    header: "Nominal",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      return <span className="font-semibold text-foreground">Rp {amount.toLocaleString("id-ID")}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const statusLabels = {
        pending: "MENUNGGU",
        paid: "LUNAS",
        failed: "GAGAL",
        partially_refunded: "REFUND SEBAGIAN",
        refunded: "REFUND PENUH",
        disputed: "SENGKETA",
      } as const;
      return (
        <div className="flex flex-wrap gap-1">
          <Badge variant={status === "paid" ? "default" : status === "pending" || status === "partially_refunded" ? "secondary" : "destructive"}>
            {statusLabels[status]}
          </Badge>
          {row.original.duplicatePayment && <Badge variant="destructive">DUPLIKAT · PERLU DICEK</Badge>}
          {row.original.reconciliationRequired && <Badge variant="outline">PERLU SINKRONISASI</Badge>}
          {row.original.refundAmount > 0 && (
            <Badge variant="outline">Refund Rp {row.original.refundAmount.toLocaleString("id-ID")}</Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "paidAt",
    header: "Waktu Pembayaran",
    cell: ({ row }) => {
      const date = row.getValue("paidAt") as Date | null;
      return <span className="text-muted-foreground text-xs">{date ? date.toLocaleString("id-ID") : "-"}</span>;
    },
  },
];
