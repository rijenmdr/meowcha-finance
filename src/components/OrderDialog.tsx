"use client";

import { useState } from "react";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
  useDashboardData,
  useFinance,
} from "@/lib/finance-context";
import { orderTotals, roundMoney } from "@/lib/calculations";
import { cx } from "@/lib/cx";
import { fmtMoney } from "@/lib/format";
import { TODAY } from "@/lib/mock-data";
import type { OrderStatus } from "@/lib/types";
import { DialogOverlay, dialogTitleClass, fieldHintClass, fieldLabelClass, inputClass } from "./DialogOverlay";

// Inputs stay strings while typing; they're parsed on submit and for the live totals.
interface ItemDraft {
  id: string;
  productId: string;
  quantity: string;
  subTotal: string;
}

const itemGridClass = "grid grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_1.75rem] items-center gap-2";

const summaryRowClass = "flex justify-between text-13";

const toNumber = (v: string) => parseFloat(v) || 0;

export function OrderDialog() {
  const { submitOrder } = useFinance();
  const {
    editingOrder,
    customerOptions,
    orderProductOptions,
    incomeCategoryOptions,
    incomeChannelOptions,
    defaultPaymentCategoryId,
    deliveryProviderOptions,
    paymentMethodOptions,
  } = useDashboardData();

  const [items, setItems] = useState<ItemDraft[]>(() =>
    editingOrder
      ? editingOrder.items.map((i) => ({ id: i.id, productId: i.productId, quantity: String(i.quantity), subTotal: String(i.subTotal) }))
      : [{ id: crypto.randomUUID(), productId: "", quantity: "1", subTotal: "" }],
  );
  const [deliveryCharge, setDeliveryCharge] = useState(editingOrder ? String(editingOrder.deliveryCharge) : "0");
  // Only a new order takes a payment here; an existing one shows what its payments add up to.
  const [amountPaid, setAmountPaid] = useState("0");

  const priceOf = (productId: string) => orderProductOptions.find((p) => p.id === productId)?.price ?? 0;
  const totals = orderTotals(
    items.map((i) => ({ subTotal: toNumber(i.subTotal) })),
    toNumber(deliveryCharge),
    editingOrder ? editingOrder.amountPaid : toNumber(amountPaid),
  );

  // Changing the product or quantity reprices the line; the sub-total can
  // still be overwritten afterwards, e.g. for a discount.
  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (patch.productId !== undefined || patch.quantity !== undefined) {
          next.subTotal = next.productId ? String(roundMoney(priceOf(next.productId) * (parseInt(next.quantity, 10) || 0))) : "";
        }
        return next;
      }),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), productId: "", quantity: "1", subTotal: "" }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(fd: FormData) {
    const paidNow = roundMoney(toNumber(amountPaid));
    return submitOrder({
      customerId: String(fd.get("customerId") || ""),
      orderDate: String(fd.get("orderDate") || ""),
      status: String(fd.get("status")) as OrderStatus,
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: parseInt(i.quantity, 10) || 0,
        subTotal: roundMoney(toNumber(i.subTotal)),
      })),
      deliveryCharge: roundMoney(toNumber(deliveryCharge)),
      deliveryProviderId: String(fd.get("deliveryProviderId") || "") || null,
      paymentMethodId: String(fd.get("paymentMethodId") || "") || null,
      payment:
        !editingOrder && paidNow > 0
          ? {
              date: String(fd.get("orderDate") || ""),
              amount: paidNow,
              categoryId: String(fd.get("paymentCategoryId") || ""),
              channelId: String(fd.get("paymentChannelId") || "") || null,
            }
          : null,
    });
  }

  return (
    <DialogOverlay className="max-w-160" onSubmit={handleSubmit}>
      <div className={dialogTitleClass}>{editingOrder ? `Edit order ${editingOrder.orderNumber}` : "New order"}</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Order number</label>
          <div className={cx(inputClass, "flex items-center text-ink/60")}>
            {editingOrder ? editingOrder.orderNumber : "Assigned when saved"}
          </div>
        </div>
        <div>
          <label className={fieldLabelClass}>Order date</label>
          <input type="date" name="orderDate" defaultValue={editingOrder ? editingOrder.orderDate : TODAY} required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Customer</label>
          <select name="customerId" defaultValue={editingOrder?.customerId ?? ""} required className={inputClass}>
            <option value="" disabled>
              Choose a customer…
            </option>
            {customerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {customerOptions.length === 0 && <div className={fieldHintClass}>Add a customer first, on the Customers page.</div>}
        </div>
        <div>
          <label className={fieldLabelClass}>Order status</label>
          <select name="status" defaultValue={editingOrder ? editingOrder.status : "processing"} className={inputClass}>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((st) => (
              <option key={st} value={st}>
                {ORDER_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Delivery provider (optional)</label>
          <select name="deliveryProviderId" defaultValue={editingOrder?.deliveryProviderId ?? ""} className={inputClass}>
            <option value="">No provider</option>
            {deliveryProviderOptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          {deliveryProviderOptions.length === 0 && (
            <div className={fieldHintClass}>No providers yet. Add one on the Delivery providers page.</div>
          )}
        </div>
        <div>
          <label className={fieldLabelClass}>Payment method (optional)</label>
          <select name="paymentMethodId" defaultValue={editingOrder?.paymentMethodId ?? ""} className={inputClass}>
            <option value="">No method</option>
            {paymentMethodOptions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          {paymentMethodOptions.length === 0 && (
            <div className={fieldHintClass}>No methods yet. Add one on the Payment methods page.</div>
          )}
        </div>
      </div>

      <div>
        <div className={cx(itemGridClass, "mb-1.25")}>
          <span className="text-12 text-ink/70">Product</span>
          <span className="text-12 text-ink/70">Qty</span>
          <span className="text-12 text-ink/70">Sub-total (Rs)</span>
          <span />
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const takenElsewhere = new Set(items.filter((x) => x.id !== item.id).map((x) => x.productId));
            return (
              <div key={item.id} className={itemGridClass}>
                <select
                  aria-label="Product"
                  value={item.productId}
                  onChange={(e) => updateItem(item.id, { productId: e.target.value })}
                  required
                  className={inputClass}
                >
                  <option value="">Choose a product…</option>
                  {orderProductOptions
                    .filter((p) => p.id === item.productId || !takenElsewhere.has(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} — {fmtMoney(p.price)}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  aria-label="Quantity"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                  required
                  className={inputClass}
                />
                <input
                  type="number"
                  aria-label="Sub-total"
                  min="0"
                  step="0.01"
                  value={item.subTotal}
                  onChange={(e) => updateItem(item.id, { subTotal: e.target.value })}
                  required
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="inline-flex size-7 cursor-pointer items-center justify-center border border-line bg-transparent p-0 disabled:cursor-default disabled:opacity-40"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= orderProductOptions.length}
          className="mt-2 cursor-pointer border-none bg-transparent p-0 font-condensed text-13 font-semibold text-accent-500 disabled:cursor-default disabled:opacity-50"
        >
          + Add item
        </button>
        {orderProductOptions.length === 0 && <div className={fieldHintClass}>Add products first, on the Products page.</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>Delivery charge (Rs)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={deliveryCharge}
            onChange={(e) => setDeliveryCharge(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={fieldLabelClass}>{editingOrder ? "Amount paid" : "Amount paid now (Rs)"}</label>
          {editingOrder ? (
            <div className={cx(inputClass, "flex items-center text-ink/60")}>{fmtMoney(editingOrder.amountPaid)}</div>
          ) : (
            <input
              type="number"
              min="0"
              max={totals.totalPrice}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              required
              className={inputClass}
            />
          )}
        </div>
      </div>
      {editingOrder && (
        <div className={fieldHintClass}>
          Add payments with Record payment on the Orders table. Correct or remove one on the Transactions page.
        </div>
      )}

      {!editingOrder && toNumber(amountPaid) > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabelClass}>Payment income category</label>
            <select name="paymentCategoryId" defaultValue={defaultPaymentCategoryId} required className={inputClass}>
              {incomeCategoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabelClass}>Payment channel (optional)</label>
            <select name="paymentChannelId" defaultValue="" className={inputClass}>
              <option value="">No channel</option>
              {incomeChannelOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className={cx(fieldHintClass, "col-span-2 mt-0")}>Recorded as an income transaction dated the order date.</div>
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
        <div className={summaryRowClass}>
          <span className="text-ink/60">Sub-total</span>
          <span>{fmtMoney(totals.subTotal)}</span>
        </div>
        <div className={summaryRowClass}>
          <span className="text-ink/60">Delivery</span>
          <span>{fmtMoney(toNumber(deliveryCharge))}</span>
        </div>
        <div className={cx(summaryRowClass, "font-semibold")}>
          <span>Total</span>
          <span>{fmtMoney(totals.totalPrice)}</span>
        </div>
        <div className={cx(summaryRowClass, "items-center")}>
          <span className="text-ink/60">Payment</span>
          <span className={cx("px-2 py-0.75 text-11", PAYMENT_STATUS_CLASSES[totals.paymentStatus])}>
            {PAYMENT_STATUS_LABELS[totals.paymentStatus]}
          </span>
        </div>
      </div>
    </DialogOverlay>
  );
}
