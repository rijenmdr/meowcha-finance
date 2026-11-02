"use client";

import { useId } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useSubmitInvoice } from "@/hooks/mutations/use-invoice-mutations";
import { todayISO } from "@/lib/utils/date-math";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CustomerPicker } from "@/components/shared/customer-picker";
import { DialogOverlay } from "./dialog-overlay";

export function InvoiceDialog() {
  const submitInvoice = useSubmitInvoice();
  const { editingInvoice, initialCustomer } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitInvoice({
      customerId: String(fd.get("customerId") || "") || null,
      issueDate: String(fd.get("issueDate") || ""),
      dueDate: String(fd.get("dueDate") || ""),
      amount: parseFloat(String(fd.get("amount") || "0")) || 0,
      paid: fd.get("paid") === "on",
    });
  }

  return (
    <DialogOverlay title={editingInvoice ? "Edit invoice" : "New invoice"} className="max-w-110" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-customer`}>Customer (optional)</FieldLabel>
        <CustomerPicker id={`${id}-customer`} name="customerId" initial={initialCustomer} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-issue`}>Issue date</FieldLabel>
          <Input
            id={`${id}-issue`}
            type="date"
            name="issueDate"
            defaultValue={editingInvoice ? editingInvoice.issueDate : todayISO()}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-due`}>Due date</FieldLabel>
          <Input id={`${id}-due`} type="date" name="dueDate" defaultValue={editingInvoice ? editingInvoice.dueDate : todayISO()} required />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${id}-amount`}>Amount</FieldLabel>
        <Input
          id={`${id}-amount`}
          type="number"
          step="0.01"
          min="0"
          name="amount"
          defaultValue={editingInvoice ? editingInvoice.amount : ""}
          required
        />
      </Field>

      <Field orientation="horizontal" className="w-fit">
        <input
          id={`${id}-paid`}
          type="checkbox"
          name="paid"
          defaultChecked={editingInvoice ? editingInvoice.paid : false}
          className="size-4 cursor-pointer"
        />
        <FieldLabel htmlFor={`${id}-paid`} className="cursor-pointer text-14 text-foreground">
          Paid
        </FieldLabel>
      </Field>
    </DialogOverlay>
  );
}
