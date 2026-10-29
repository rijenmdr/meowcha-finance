"use client";

import { useId } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { ParentOrder } from "@/models/order";
import { readOnlyValueClass } from "./order-details-fields";
import { ParentOrderPicker } from "./parent-order-picker";

// A request's link to a processing order. It's chosen only when the request is
// created; after that it shows read-only. A standalone request shows nothing.
export function OrderParentField({
  canPick,
  parent,
  onChange,
}: {
  canPick: boolean;
  parent: ParentOrder | null;
  onChange: (order: ParentOrder | null) => void;
}) {
  const fieldId = useId();
  if (!canPick && !parent) return null;

  return (
    <Field>
      <FieldLabel htmlFor={`${fieldId}-parent`}>Parent order{canPick ? " (optional)" : ""}</FieldLabel>
      {canPick ? (
        <ParentOrderPicker id={`${fieldId}-parent`} value={parent} onChange={onChange} />
      ) : (
        <div className={readOnlyValueClass}>
          {parent?.orderNumber} · {parent?.customerName}
        </div>
      )}
      <FieldDescription>
        {parent
          ? `Customer, dates, delivery and note follow ${parent.orderNumber}. Its advance covers it first and this request with the rest, each time it's saved. Merge this request into it once the items are made.`
          : "Link the request to a processing order to make the items it's missing. Only the products are entered here."}
      </FieldDescription>
    </Field>
  );
}
