"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DialogOverlay } from "./DialogOverlay";

export function PaymentMethodDialog() {
  const { submitPaymentMethod } = useFinance();
  const { editingPaymentMethod } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitPaymentMethod({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay
      title={editingPaymentMethod ? "Edit payment method" : "Add payment method"}
      className="max-w-105"
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingPaymentMethod ? editingPaymentMethod.name : ""}
          required
          pattern=".*\S.*"
        />
        <FieldDescription>
          {editingPaymentMethod
            ? "Renaming updates every order that uses this payment method."
            : "How a customer pays for an order, e.g. cash, eSewa or bank transfer."}
        </FieldDescription>
      </Field>
    </DialogOverlay>
  );
}
