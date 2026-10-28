import type { ColumnDef } from "@tanstack/react-table";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { SortableHeader } from "@/components/shared/sortable-header";
import { cn } from "@/lib/utils/cn";
import type { TxnRow } from "@/models/transaction";

export interface TxnRowHandlers {
  openEditTxn: (row: TxnRow) => void;
  deleteTxn: (row: TxnRow) => void;
}

export function buildTransactionColumns({ openEditTxn, deleteTxn }: TxnRowHandlers): ColumnDef<TxnRow>[] {
  return [
    {
      accessorKey: "date",
      header: ({ header }) => <SortableHeader header={header} title="Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.dateDisplay}</span>,
    },
    {
      accessorKey: "description",
      header: ({ header }) => <SortableHeader header={header} title="Description" />,
      cell: ({ row }) => (
        <>
          {row.original.description}
          {row.original.customerName && <div className="mt-0.5 text-11 text-accent-600">{row.original.customerName}</div>}
          {row.original.sourceName && <div className="mt-0.5 text-11 text-ink/60">Paid from {row.original.sourceName}</div>}
        </>
      ),
    },
    {
      accessorKey: "category",
      header: ({ header }) => <SortableHeader header={header} title="Category" />,
      cell: ({ row }) => <span className={cn("px-2 py-0.75 text-11", row.original.tagClass)}>{row.original.category}</span>,
    },
    {
      accessorKey: "channel",
      header: ({ header }) => <SortableHeader header={header} title="Channel" />,
      cell: ({ row }) => <span className="text-ink/60">{row.original.channel}</span>,
    },
    {
      accessorKey: "amount",
      header: ({ header }) => <SortableHeader header={header} title="Amount" align="right" />,
      cell: ({ row }) => (
        <div className="text-right whitespace-nowrap">
          <div className={cn("font-semibold", row.original.amountClass)}>{row.original.amountDisplay}</div>
          {row.original.deliveryFeeDisplay && <div className="text-11 text-ink/60">{row.original.deliveryFeeDisplay}</div>}
        </div>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="text-right whitespace-nowrap">
          <EditButton onClick={() => openEditTxn(row.original)} />
          <DeleteButton onClick={() => deleteTxn(row.original)} />
        </div>
      ),
    },
  ];
}
