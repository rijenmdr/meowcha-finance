"use client";

import { useId } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useLookups } from "@/hooks/use-lookups";
import { todayISO } from "@/lib/utils/date-math";
import { parseAmount } from "@/lib/utils/parse-amount";
import type { OrderPayment } from "@/models/order";

// The one payment the editor creates and edits. Later payments go through the Orders table.
export function OrderAdvanceFields({
  advance,
  isRequest,
  amount,
  maxAmount,
  onAmountChange,
}: {
  advance: OrderPayment | null;
  isRequest: boolean;
  amount: string;
  maxAmount: number;
  onAmountChange: (value: string) => void;
}) {
  const fieldId = useId();
  const { incomeCategoryOptions, incomeChannelOptions, defaultPaymentCategoryId } = useLookups();
  const hasAmount = parseAmount(amount) > 0;
  const description = isRequest
    ? "Paid up front for the request. Saved as an income transaction on its date."
    : "The payment taken with the order, saved as an income transaction on its date.";

  return (
    <div className="flex flex-col gap-3 border-t border-line-soft pt-3.5">
      <div>
        <div className="font-condensed text-17 font-semibold">Advance payment</div>
        <div className="text-12 text-ink/60">
          {description}
          {advance && " To remove it, delete it on the Transactions page."}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-advance`}>Amount (Rs)</FieldLabel>
          <Input
            id={`${fieldId}-advance`}
            type="number"
            min={advance ? "0.01" : "0"}
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-advance-date`}>Date received</FieldLabel>
          <Input id={`${fieldId}-advance-date`} type="date" name="advanceDate" defaultValue={advance?.date ?? todayISO()} required={hasAmount} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-advance-category`}>Income category</FieldLabel>
          <NativeSelect
            id={`${fieldId}-advance-category`}
            name="advanceCategoryId"
            defaultValue={advance?.categoryId ?? defaultPaymentCategoryId}
            required={hasAmount}
          >
            {incomeCategoryOptions.map((category) => (
              <NativeSelectOption key={category.id} value={category.id}>
                {category.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-advance-channel`}>Channel (optional)</FieldLabel>
          <NativeSelect id={`${fieldId}-advance-channel`} name="advanceChannelId" defaultValue={advance?.channelId ?? ""}>
            <NativeSelectOption value="">No channel</NativeSelectOption>
            {incomeChannelOptions.map((channel) => (
              <NativeSelectOption key={channel.id} value={channel.id}>
                {channel.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
    </div>
  );
}
