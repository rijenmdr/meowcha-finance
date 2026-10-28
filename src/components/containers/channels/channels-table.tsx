"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Panel } from "@/components/shared/panel";
import { DeleteButton, EditButton } from "@/components/shared/icon-button";
import { useDialogStore } from "@/stores/use-dialog-store";
import { useChannelRows } from "@/hooks/mutations/use-channel-mutations";
import type { TxnType } from "@/enums/txn-type";
import { useDataTable } from "@/hooks/use-data-table";
import { SortableHeader } from "@/components/shared/sortable-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { DataTable } from "@/components/shared/data-table";

interface ChannelRow {
  id: string;
  name: string;
  usageCount: number;
  usageLabel: string;
}


export function ChannelsTable({ type, rows }: { type: TxnType; rows: ChannelRow[] }) {
  const openDialog = useDialogStore((state) => state.open);
  const { visibleRows, deleteChannel } = useChannelRows(rows);
  const title = type === "income" ? "Sales channels" : "Vendors";
  const columns = useMemo<ColumnDef<ChannelRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ header }) => <SortableHeader header={header} title="Channel" />,
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: "usageCount",
        header: ({ header }) => <SortableHeader header={header} title="Usage" align="right" />,
        cell: ({ row }) => <span className="whitespace-nowrap text-ink/60">{row.original.usageLabel}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="text-right whitespace-nowrap">
            <EditButton onClick={() => openDialog("channel", { editId: row.original.id })} />
            <DeleteButton onClick={() => deleteChannel(row.original)} />
          </div>
        ),
      },
    ],
    [deleteChannel, openDialog],
  );
  const table = useDataTable({ data: visibleRows, columns, initialSorting: [{ id: "name", desc: false }] });

  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <div className="font-condensed text-17 font-semibold">{title}</div>
        <button
          type="button"
          onClick={() => openDialog("channel", { txnFormType: type })}
          className="cursor-pointer border-none bg-transparent p-0 font-condensed text-13 font-semibold text-accent-500"
        >
          + Add
        </button>
      </div>
      <DataTable table={table} columnClasses={{ usageCount: "text-right", actions: "text-right" }} />
      <TablePagination table={table} />
      {rows.length === 0 && <div className="px-4 py-6 text-13 text-ink/55">No {type} channels yet.</div>}
    </Panel>
  );
}
