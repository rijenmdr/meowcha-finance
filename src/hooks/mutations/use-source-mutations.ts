import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteSourceAction, saveSourceAction } from "@/lib/actions/source";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Source, SourceSubmitValues } from "@/models/source";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitSource() {
  const { sources } = useLookupTables();

  return async function submitSource(values: SourceSubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const rec: Source = { id: editId || newId(), name: values.name };
    // Mirrors the DB's unique (name), but case-insensitively.
    const duplicate = sources.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate source", description: `There's already a source called "${rec.name}".` });
      return;
    }
    await saveSourceAction(rec);
    close();
  };
}

export function useSourceRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteSource = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} expense${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" source?`, description: usage, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteSourceAction(row.id), "Failed to delete source");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteSource };
}
