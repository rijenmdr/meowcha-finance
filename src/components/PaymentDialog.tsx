"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import { todayISO } from "@/lib/format";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DialogOverlay } from "./DialogOverlay";

// Records one more payment towards an order, saved as an income transaction.
export function PaymentDialog() {
  const { submitPayment } = useFinance();
  const { paymentDialog, incomeCategoryOptions, incomeChannelOptions } = useLookups();
  const id = useId();
  if (!paymentDialog) return null;

  function handleSubmit(fd: FormData) {
    return submitPayment({
      date: String(fd.get("date") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      categoryId: String(fd.get("categoryId") || ""),
      channelId: String(fd.get("channelId") || "") || null,
    });
  }

  return (
    <DialogOverlay
      title={`Record payment · ${paymentDialog.orderNumber}`}
      description={`${paymentDialog.paidDisplay} of ${paymentDialog.totalDisplay} paid so far.`}
      className="max-w-110"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-amount`}>Amount (Rs)</FieldLabel>
          <Input
            id={`${id}-amount`}
            type="number"
            name="amount"
            min="0.01"
            max={paymentDialog.balance}
            step="0.01"
            defaultValue={paymentDialog.balance}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
          <Input id={`${id}-date`} type="date" name="date" defaultValue={todayISO()} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-category`}>Income category</FieldLabel>
          <NativeSelect id={`${id}-category`} name="categoryId" defaultValue={paymentDialog.categoryId} required>
            {incomeCategoryOptions.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-channel`}>Channel (optional)</FieldLabel>
          <NativeSelect id={`${id}-channel`} name="channelId" defaultValue={paymentDialog.channelId}>
            <NativeSelectOption value="">No channel</NativeSelectOption>
            {incomeChannelOptions.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <FieldDescription>Saved as an income transaction linked to this order.</FieldDescription>
    </DialogOverlay>
  );
}
