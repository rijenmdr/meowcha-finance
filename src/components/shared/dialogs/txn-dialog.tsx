"use client";

import { useId } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useSubmitTxn } from "@/hooks/mutations/use-transaction-mutations";
import { useDialogStore } from "@/stores/use-dialog-store";
import { todayISO } from "@/lib/utils/date-math";
import type { TxnType } from "@/enums/txn-type";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DialogOverlay } from "./dialog-overlay";

// The group variant would otherwise squeeze items to px-2 when spacing is 0.
const toggleItemClass = "h-auto py-1.75 group-data-[spacing=0]/toggle-group:px-3.5";

export function TxnDialog() {
  const submitTxn = useSubmitTxn();
  const txnFormType = useDialogStore((state) => state.txnFormType);
  const setTxnFormType = useDialogStore((state) => state.setTxnFormType);
  const { editingTxn, txnCategoryOptions: categoryOptions, txnChannelOptions: channelOptions, customerOptions, sourceOptions } = useLookups();
  const id = useId();

  const isIncome = txnFormType === "income";

  function handleSubmit(fd: FormData) {
    return submitTxn({
      date: String(fd.get("date") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      categoryId: String(fd.get("categoryId") || ""),
      description: String(fd.get("description") || ""),
      channelId: String(fd.get("channelId") || "") || null,
      sourceId: String(fd.get("sourceId") || "") || null,
      customerId: String(fd.get("customerId") || "") || null,
    });
  }

  return (
    <DialogOverlay title={editingTxn ? "Edit transaction" : "Add transaction"} className="max-w-115" onSubmit={handleSubmit}>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        aria-label="Transaction type"
        value={txnFormType}
        // Radix reports "" when the active item is clicked again; keep the current type.
        onValueChange={(value) => value && setTxnFormType(value as TxnType)}
      >
        <ToggleGroupItem value="income" className={toggleItemClass}>
          Income
        </ToggleGroupItem>
        <ToggleGroupItem value="expense" className={toggleItemClass}>
          Expense
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
          <Input id={`${id}-date`} type="date" name="date" defaultValue={editingTxn ? editingTxn.date : todayISO()} required />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-amount`}>Amount</FieldLabel>
          <Input
            id={`${id}-amount`}
            type="number"
            step="0.01"
            min="0"
            name="amount"
            defaultValue={editingTxn ? editingTxn.amount : ""}
            required
          />
        </Field>
      </div>

      <Field key={txnFormType}>
        <FieldLabel htmlFor={`${id}-category`}>Category</FieldLabel>
        <NativeSelect
          id={`${id}-category`}
          name="categoryId"
          defaultValue={editingTxn && editingTxn.type === txnFormType ? editingTxn.categoryId : categoryOptions[0]?.id}
          required
        >
          {categoryOptions.map((cat) => (
            <NativeSelectOption key={cat.id} value={cat.id}>
              {cat.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {categoryOptions.length === 0 && (
          <FieldDescription>No {txnFormType} categories yet. Add one on the Categories page.</FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
        <Input
          id={`${id}-description`}
          type="text"
          name="description"
          defaultValue={editingTxn ? editingTxn.description : ""}
          required
        />
      </Field>

      {isIncome && (
        <Field>
          <FieldLabel htmlFor={`${id}-customer`}>Customer (optional)</FieldLabel>
          <NativeSelect id={`${id}-customer`} name="customerId" defaultValue={editingTxn?.customerId ?? ""}>
            <NativeSelectOption value="">No customer</NativeSelectOption>
            {customerOptions.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}

      {!isIncome && (
        <Field>
          <FieldLabel htmlFor={`${id}-source`}>Source (optional)</FieldLabel>
          <NativeSelect id={`${id}-source`} name="sourceId" defaultValue={editingTxn?.sourceId ?? ""}>
            <NativeSelectOption value="">No source</NativeSelectOption>
            {sourceOptions.map((x) => (
              <NativeSelectOption key={x.id} value={x.id}>
                {x.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {sourceOptions.length === 0 && <FieldDescription>No sources yet. Add one on the Sources page.</FieldDescription>}
        </Field>
      )}

      <Field key={`channel-${txnFormType}`}>
        <FieldLabel htmlFor={`${id}-channel`}>Channel / vendor (optional)</FieldLabel>
        <NativeSelect
          id={`${id}-channel`}
          name="channelId"
          defaultValue={editingTxn && editingTxn.type === txnFormType ? (editingTxn.channelId ?? "") : ""}
        >
          <NativeSelectOption value="">No channel</NativeSelectOption>
          {channelOptions.map((ch) => (
            <NativeSelectOption key={ch.id} value={ch.id}>
              {ch.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {channelOptions.length === 0 && (
          <FieldDescription>No {txnFormType} channels yet. Add one on the Channels page.</FieldDescription>
        )}
      </Field>
    </DialogOverlay>
  );
}
