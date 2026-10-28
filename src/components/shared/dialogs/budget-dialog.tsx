"use client";

import { useId } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useSubmitBudget } from "@/hooks/mutations/use-budget-mutations";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DialogOverlay } from "./dialog-overlay";

export function BudgetDialog() {
  const submitBudget = useSubmitBudget();
  const { editingBudget, expenseCategoryOptions } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitBudget({
      categoryId: String(fd.get("categoryId") || ""),
      target: parseFloat(String(fd.get("target") || "0")) || 0,
    });
  }

  return (
    <DialogOverlay title={editingBudget ? "Edit budget" : "Add budget category"} className="max-w-105" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-category`}>Category</FieldLabel>
        <NativeSelect
          id={`${id}-category`}
          name="categoryId"
          defaultValue={editingBudget ? editingBudget.categoryId : expenseCategoryOptions[0]?.id}
          disabled={!!editingBudget}
          required
        >
          {expenseCategoryOptions.map((cat) => (
            <NativeSelectOption key={cat.id} value={cat.id}>
              {cat.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-target`}>Monthly target</FieldLabel>
        <Input
          id={`${id}-target`}
          type="number"
          step="1"
          min="0"
          name="target"
          defaultValue={editingBudget ? editingBudget.target : ""}
          required
        />
      </Field>
    </DialogOverlay>
  );
}
