"use client";

import { useFinance, useDashboardData } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

export function ChannelDialog() {
  const { state, submitChannel } = useFinance();
  const { editingChannel } = useDashboardData();

  function handleSubmit(fd: FormData) {
    return submitChannel({
      name: String(fd.get("name") || "").trim(),
      type: (editingChannel?.type ?? String(fd.get("type"))) as TxnType,
    });
  }

  return (
    <DialogOverlay className="max-w-105" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingChannel ? "Edit channel" : "Add channel"}</div>

      <div>
        <label className={fieldLabelClass}>Type</label>
        <select
          name="type"
          defaultValue={editingChannel ? editingChannel.type : state.txnFormType}
          disabled={!!editingChannel}
          className={inputClass}
        >
          <option value="income">Income (sales channel)</option>
          <option value="expense">Expense (vendor)</option>
        </select>
      </div>

      <div>
        <label className={fieldLabelClass}>Name</label>
        <input
          type="text"
          name="name"
          defaultValue={editingChannel ? editingChannel.name : ""}
          required
          pattern=".*\S.*"
          className={inputClass}
        />
        {editingChannel && (
          <div className={fieldHintClass}>
            Renaming updates every transaction that uses this channel.
          </div>
        )}
      </div>

    </DialogOverlay>
  );
}
