"use client";

import { useCallback, useMemo, useOptimistic } from "react";
import { DataTable } from "@/components/shared/data-table";
import { Panel } from "@/components/shared/panel";
import { TablePagination } from "@/components/shared/table-pagination";
import { useTransactionRows } from "@/hooks/mutations/use-transaction-mutations";
import { useServerDataTable } from "@/hooks/use-data-table";
import { useUrlSearch } from "@/hooks/use-url-search";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { TableQuery } from "@/lib/helpers/table-params";
import type { TxnRow } from "@/models/transaction";
import { buildTransactionColumns } from "./transaction-columns";
import { TransactionFilters, type TxnFilters } from "./transaction-filters";

// The rows are one page from the server. Filters, sort and page live in the
// URL (?type=…&category=…&sort=…&page=…), so changing one reloads the page.
export function TransactionsTable({
  rows,
  total,
  query,
  filters,
  countLabel,
}: {
  rows: TxnRow[];
  total: number;
  query: TableQuery;
  filters: TxnFilters;
  countLabel: string;
}) {
  const { setSearch } = useUrlSearch();
  const openDialog = useDialogStore((state) => state.open);
  // The selects show the new choice while the filtered page loads.
  const [shownFilters, setOptimisticFilters] = useOptimistic(filters);
  const { visibleRows, deleteTxn } = useTransactionRows(rows);

  const openEditTxn = useCallback(
    (row: TxnRow) => openDialog("txn", { editId: row.id, editingTxn: row.txn, txnFormType: row.txn.type }),
    [openDialog],
  );
  const columns = useMemo(() => buildTransactionColumns({ openEditTxn, deleteTxn }), [openEditTxn, deleteTxn]);
  const table = useServerDataTable({ data: visibleRows, columns, rowCount: total, query });

  function setFilters(next: TxnFilters) {
    setSearch(
      { type: next.type === "all" ? null : next.type, category: next.category === "all" ? null : next.category, page: null },
      () => setOptimisticFilters(next),
    );
  }

  return (
    <div>
      <TransactionFilters filters={shownFilters} onChange={setFilters} countLabel={countLabel} />

      <Panel>
        <DataTable table={table} columnClasses={{ amount: "text-right", actions: "text-right" }} cellClasses={{ date: "whitespace-nowrap text-ink/60" }} />
        <TablePagination table={table} />
        {total === 0 && <div className="px-4 py-6 text-13 text-ink/55">No transactions match these filters.</div>}
      </Panel>
    </div>
  );
}
