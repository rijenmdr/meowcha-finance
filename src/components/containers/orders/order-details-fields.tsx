"use client";

import { useId } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ORDER_STATUS_LABELS } from "@/constants/order-status";
import { useLookups } from "@/hooks/use-lookups";
import { todayISO } from "@/lib/utils/date-math";
import { fmtDate } from "@/lib/utils/format-date";
import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { Order } from "@/models/order";

const readOnlyValueClass = "flex min-h-9 items-center border border-line bg-surface px-2.5 py-1.5 text-14 text-ink/60";

// Dates, customer, status, delivery and payment method.
export function OrderDetailsFields({ mode, order }: { mode: OrderEditorMode; order: Order | null }) {
  const fieldId = useId();
  const { customerOptions, deliveryProviderOptions, paymentMethodOptions } = useLookups();
  const isRequest = mode === "new-request" || mode === "edit-request";
  const showStatusSelect = mode === "new" || mode === "edit";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {order && (
          <Field>
            <FieldLabel>Order number</FieldLabel>
            <div className={readOnlyValueClass}>{order.orderNumber}</div>
          </Field>
        )}
        {mode === "new-request" && (
          <Field>
            <FieldLabel htmlFor={`${fieldId}-requested`}>Requested date</FieldLabel>
            <Input id={`${fieldId}-requested`} type="date" name="requestedDate" defaultValue={todayISO()} required />
          </Field>
        )}
        {mode !== "new-request" && order?.requestedDate && (
          <Field>
            <FieldLabel>Requested date</FieldLabel>
            <div className={readOnlyValueClass}>{fmtDate(order.requestedDate)}</div>
          </Field>
        )}
        {!isRequest && (
          <Field>
            <FieldLabel htmlFor={`${fieldId}-date`}>Order date</FieldLabel>
            <Input
              id={`${fieldId}-date`}
              type="date"
              name="orderDate"
              defaultValue={order && mode !== "convert" ? order.orderDate : todayISO()}
              required
            />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-customer`}>Customer</FieldLabel>
          <NativeSelect id={`${fieldId}-customer`} name="customerId" defaultValue={order?.customerId ?? ""} required>
            <NativeSelectOption value="" disabled>
              Choose a customer…
            </NativeSelectOption>
            {customerOptions.map((customer) => (
              <NativeSelectOption key={customer.id} value={customer.id}>
                {customer.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {customerOptions.length === 0 && <FieldDescription>Add a customer first, on the Customers page.</FieldDescription>}
        </Field>
        {/* guard_order_status only lets a request move on to processing. */}
        {mode === "convert" && (
          <Field>
            <FieldLabel>Order status</FieldLabel>
            <input type="hidden" name="status" value="processing" />
            <div className={readOnlyValueClass}>{ORDER_STATUS_LABELS.processing}</div>
          </Field>
        )}
        {showStatusSelect && (
          <Field>
            <FieldLabel htmlFor={`${fieldId}-status`}>Order status</FieldLabel>
            <NativeSelect id={`${fieldId}-status`} name="status" defaultValue={order ? order.status : "processing"}>
              <NativeSelectOption value="processing">Processing</NativeSelectOption>
              <NativeSelectOption value="ready_for_delivery">Ready for delivery</NativeSelectOption>
              <NativeSelectOption value="out_for_delivery">Out for delivery</NativeSelectOption>
              <NativeSelectOption value="delivered">Delivered</NativeSelectOption>
            </NativeSelect>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-location`}>Delivery location (optional)</FieldLabel>
          <Input id={`${fieldId}-location`} type="text" name="deliveryLocation" defaultValue={order?.deliveryLocation ?? ""} placeholder="Street, area, or landmark" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-provider`}>Delivery provider (optional)</FieldLabel>
          <NativeSelect id={`${fieldId}-provider`} name="deliveryProviderId" defaultValue={order?.deliveryProviderId ?? ""}>
            <NativeSelectOption value="">No provider</NativeSelectOption>
            {deliveryProviderOptions.map((provider) => (
              <NativeSelectOption key={provider.id} value={provider.id}>
                {provider.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {deliveryProviderOptions.length === 0 && <FieldDescription>No providers yet. Add one on the Delivery providers page.</FieldDescription>}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-method`}>Payment method (optional)</FieldLabel>
          <NativeSelect id={`${fieldId}-method`} name="paymentMethodId" defaultValue={order?.paymentMethodId ?? ""}>
            <NativeSelectOption value="">No method</NativeSelectOption>
            {paymentMethodOptions.map((method) => (
              <NativeSelectOption key={method.id} value={method.id}>
                {method.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {paymentMethodOptions.length === 0 && <FieldDescription>No methods yet. Add one on the Payment methods page.</FieldDescription>}
        </Field>
      </div>
    </>
  );
}
