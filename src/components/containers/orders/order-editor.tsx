"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/shared/panel";
import { useOrderForm } from "@/hooks/use-order-form";
import type { OrderEditorMode } from "@/enums/order-editor-mode";
import type { Order } from "@/models/order";
import { OrderAdvanceFields } from "./order-advance-fields";
import { OrderDetailsFields } from "./order-details-fields";
import { OrderEditorHeader } from "./order-editor-header";
import { OrderItemsFields } from "./order-items-fields";
import { OrderParentField } from "./order-parent-field";
import { OrderSummary } from "./order-summary";

// order is loaded by the page on the server; null when new, or when the id matched nothing.
export function OrderEditor({ mode, order }: { mode: OrderEditorMode; order: Order | null }) {
  const fieldId = useId();
  const form = useOrderForm(mode, order);
  const { parent } = form;

  if (!form.isNew && !order) {
    return (
      <Panel className="p-6">
        <div className="font-condensed text-20 font-semibold">Order not found</div>
        <div className="mt-2 text-13 text-ink/60">That order may have been deleted or the link is stale.</div>
        <Button type="button" variant="outline" onClick={form.goBack} className="mt-4">
          Back to orders
        </Button>
      </Panel>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} className="grid gap-4.5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Panel className="p-6">
        <OrderEditorHeader mode={mode} order={order} pending={form.pending} onBack={form.goBack} />

        <fieldset disabled={form.pending || form.readOnly} className="flex min-w-0 flex-col gap-3.5">
          {form.isRequest && <OrderParentField canPick={form.canPickParent} parent={parent} onChange={form.setParent} />}
          {/* Keyed so the uncontrolled fields pick up the chosen order's values. */}
          <OrderDetailsFields key={parent?.id ?? "own"} mode={mode} order={order} parent={parent} statusLock={form.statusLock} />
          <OrderItemsFields orderItems={form.orderItems} tracksStock={form.tracksStock} isRequest={form.isRequest} />

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`${fieldId}-delivery`}>Delivery charge (Rs)</FieldLabel>
              <Input
                id={`${fieldId}-delivery`}
                type="number"
                min="0"
                step="0.01"
                value={parent ? String(parent.deliveryCharge) : form.deliveryCharge}
                onChange={(event) => form.setDeliveryCharge(event.target.value)}
                disabled={!!parent}
                required
              />
            </Field>
          </div>

          {!form.readOnly && !parent && (
            <OrderAdvanceFields
              advance={form.advance}
              isRequest={form.isRequest}
              amount={form.advanceAmount}
              maxAmount={form.maxAdvance}
              onAmountChange={form.setAdvanceAmount}
            />
          )}

          <Field>
            <FieldLabel htmlFor={`${fieldId}-note`}>Note (optional)</FieldLabel>
            <Textarea
              key={parent?.id ?? "own"}
              id={`${fieldId}-note`}
              name="note"
              maxLength={2000}
              defaultValue={(parent ?? order)?.note ?? ""}
              disabled={!!parent}
              placeholder={form.isRequest ? "What the customer asked for, timing, anything to remember" : "Anything to remember about this order"}
            />
          </Field>

          {form.error && <FieldError>{form.error}</FieldError>}
        </fieldset>
      </Panel>

      <OrderSummary
        isRequest={form.isRequest}
        totals={form.totals}
        paidValue={form.paidValue}
        balanceDue={form.balanceDue}
        links={{ toMakeTotal: form.toMakeTotal, parent, requestsAdvance: form.requestsAdvance }}
      />
    </form>
  );
}
