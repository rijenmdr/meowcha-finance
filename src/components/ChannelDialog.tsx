"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DialogOverlay } from "./DialogOverlay";

export function ChannelDialog() {
  const { state, submitChannel } = useFinance();
  const { editingChannel } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitChannel({
      name: String(fd.get("name") || "").trim(),
      type: (editingChannel?.type ?? String(fd.get("type"))) as TxnType,
    });
  }

  return (
    <DialogOverlay title={editingChannel ? "Edit channel" : "Add channel"} className="max-w-105" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-type`}>Type</FieldLabel>
        <NativeSelect
          id={`${id}-type`}
          name="type"
          defaultValue={editingChannel ? editingChannel.type : state.txnFormType}
          disabled={!!editingChannel}
        >
          <NativeSelectOption value="income">Income (sales channel)</NativeSelectOption>
          <NativeSelectOption value="expense">Expense (vendor)</NativeSelectOption>
        </NativeSelect>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingChannel ? editingChannel.name : ""}
          required
          pattern=".*\S.*"
        />
        {editingChannel && <FieldDescription>Renaming updates every transaction that uses this channel.</FieldDescription>}
      </Field>
    </DialogOverlay>
  );
}
