import { useCallback } from "react";
import { useLookupTables } from "@/components/shared/lookups-provider";
import { deleteChannelAction, saveChannelAction } from "@/lib/actions/channel";
import { newId } from "@/lib/utils/new-id";
import { confirm, notify } from "@/stores/use-confirm-store";
import { useDialogStore } from "@/stores/use-dialog-store";
import type { Channel, ChannelSubmitValues } from "@/models/channel";
import type { UsedRow } from "@/models/table-row";
import { useOptimisticRows } from "../use-optimistic-rows";

export function useSubmitChannel() {
  const { channels } = useLookupTables();

  return async function submitChannel(values: ChannelSubmitValues) {
    const { editId, close } = useDialogStore.getState();
    const existing = editId ? channels.find((c) => c.id === editId) : undefined;
    const rec: Channel = { id: existing?.id ?? newId(), name: values.name, type: existing?.type ?? values.type };
    const duplicate = channels.some((c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      void notify({ title: "Duplicate channel", description: `There's already a ${rec.type} channel called "${rec.name}".` });
      return;
    }
    await saveChannelAction(rec);
    close();
  };
}

export function useChannelRows<T extends { id: string }>(rows: T[]) {
  const { visibleRows, runOptimistic } = useOptimisticRows(rows);

  const deleteChannel = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} transaction${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" channel?`, description: usage, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteChannelAction(row.id), "Failed to delete channel");
    },
    [runOptimistic],
  );

  return { visibleRows, deleteChannel };
}
