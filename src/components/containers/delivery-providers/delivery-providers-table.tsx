"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "@/components/shared/panel";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { useDialogStore } from "@/stores/use-dialog-store";
import { useDeliveryProviderRows } from "@/hooks/mutations/use-delivery-provider-mutations";
import { useDataTable } from "@/hooks/use-data-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { DataTable } from "@/components/shared/data-table";

interface DeliveryProviderRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
  inRangeCharges: number;
  inRangeDisplay: string;
}


export function DeliveryProvidersTable({ rows, empty }: { rows: DeliveryProviderRow[]; empty: boolean }) {
  const openDialog = useDialogStore((state) => state.open);
  const { visibleRows, deleteDeliveryProvider } = useDeliveryProviderRows(rows);
  const columns = useMemo<ColumnDef<DeliveryProviderRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Provider" />,
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        accessorKey: "inRangeCharges",
        header: ({ header }) => <SortableHeader header={header} title="Delivery charges in range" align="right" />,
        cell: ({ row }) => <span className="text-right font-semibold whitespace-nowrap">{row.original.inRangeDisplay}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openDialog("deliveryProvider", { editId: row.original.id })} />
            <DeleteButton onClick={() => deleteDeliveryProvider(row.original)} />
          </div>
        ),
      },
    ],
    [deleteDeliveryProvider, openDialog],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <DataTable table={table} columnClasses={{ inRangeCharges: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {empty && <div className="px-4 py-6 text-13 text-ink/55">No delivery providers yet. Add one, then pick it on an order.</div>}
    </Panel>
  );
}
