"use client";

import { useId } from "react";
import { useLookups } from "@/hooks/use-lookups";
import { useSubmitDeliveryProvider } from "@/hooks/mutations/use-delivery-provider-mutations";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DialogOverlay } from "./dialog-overlay";

export function DeliveryProviderDialog() {
  const submitDeliveryProvider = useSubmitDeliveryProvider();
  const { editingDeliveryProvider } = useLookups();
  const id = useId();

  function handleSubmit(fd: FormData) {
    return submitDeliveryProvider({ name: String(fd.get("name") || "").trim() });
  }

  return (
    <DialogOverlay
      title={editingDeliveryProvider ? "Edit delivery provider" : "Add delivery provider"}
      className="max-w-105"
      onSubmit={handleSubmit}
    >
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          type="text"
          name="name"
          defaultValue={editingDeliveryProvider ? editingDeliveryProvider.name : ""}
          required
          pattern=".*\S.*"
        />
        <FieldDescription>
          {editingDeliveryProvider
            ? "Renaming updates every order that uses this delivery provider."
            : "Who carries an order to the customer, e.g. a courier or self pickup."}
        </FieldDescription>
      </Field>
    </DialogOverlay>
  );
}
