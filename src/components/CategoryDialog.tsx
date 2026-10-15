"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import type { TxnType } from "@/lib/types";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DialogOverlay } from "./DialogOverlay";

export function CategoryDialog() {
  const { state, submitCategory } = useFinance();
  const { editingCategory } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitCategory({
      name: String(fd.get("name") || "").trim(),
      type: (editingCategory?.type ?? String(fd.get("type"))) as TxnType,
    });
  }

  return (
    <DialogOverlay title={editingCategory ? "Edit category" : "Add category"} className="max-w-105" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-type`}>Type</FieldLabel>
        <NativeSelect
          id={`${id}-type`}
          name="type"
          defaultValue={editingCategory ? editingCategory.type : state.txnFormType}
          disabled={!!editingCategory}
        >
          <NativeSelectOption value="income">Income</NativeSelectOption>
          <NativeSelectOption value="expense">Expense</NativeSelectOption>
        </NativeSelect>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingCategory ? editingCategory.name : ""}
          required
          pattern=".*\S.*"
        />
        {editingCategory && (
          <FieldDescription>Renaming updates every transaction and budget that uses this category.</FieldDescription>
        )}
      </Field>
    </DialogOverlay>
  );
}
