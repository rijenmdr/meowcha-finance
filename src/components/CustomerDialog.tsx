"use client";

import { useId } from "react";
import { useFinance, useLookups } from "@/lib/finance-context";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogOverlay } from "./DialogOverlay";

export function CustomerDialog() {
  const { submitCustomer } = useFinance();
  const { editingCustomer } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitCustomer({
      name: String(fd.get("name") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
    });
  }

  return (
    <DialogOverlay title={editingCustomer ? "Edit customer" : "Add customer"} className="max-w-115" onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input id={`${id}-name`} type="text" name="name" defaultValue={editingCustomer ? editingCustomer.name : ""} required />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-company`}>Company (optional)</FieldLabel>
        <Input id={`${id}-company`} type="text" name="company" defaultValue={editingCustomer ? editingCustomer.company : ""} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>Email (optional)</FieldLabel>
          <Input id={`${id}-email`} type="email" name="email" defaultValue={editingCustomer ? editingCustomer.email : ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-phone`}>Phone (optional)</FieldLabel>
          <Input id={`${id}-phone`} type="tel" name="phone" defaultValue={editingCustomer ? editingCustomer.phone : ""} />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${id}-notes`}>Notes (optional)</FieldLabel>
        <Textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          defaultValue={editingCustomer ? editingCustomer.notes : ""}
          className="field-sizing-fixed resize-y"
        />
      </Field>
    </DialogOverlay>
  );
}
