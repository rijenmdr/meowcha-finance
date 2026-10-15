"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useLookups, useFinance, withDateFilter } from "@/lib/finance-context";
import { orderTotals, roundMoney } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { fmtMoney, todayISO } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { Panel } from "./Panel";

interface ItemDraft {
    id: string;
    productId: string;
    quantity: string;
    subTotal: string;
}

const itemGridClass = "grid grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_1.75rem] items-center gap-2";
const summaryRowClass = "flex justify-between text-13";
const readOnlyValueClass = "flex min-h-9 items-center border border-line bg-surface px-2.5 py-1.5 text-14 text-ink/60";
const toNumber = (v: string) => parseFloat(v) || 0;

function buildItemDrafts(order: Order | null): ItemDraft[] {
    return order
        ? order.items.map((item) => ({ id: item.id, productId: item.variantId, quantity: String(item.quantity), subTotal: String(item.subTotal) }))
        : [{ id: crypto.randomUUID(), productId: "", quantity: "1", subTotal: "" }];
}

// order is loaded by the page on the server; null when new, or when the id matched nothing.
export function OrderEditorPage({ mode, order }: { mode: "new" | "edit"; order: Order | null }) {
    const router = useRouter();
    const fieldId = useId();
    const { submitOrder } = useFinance();
    const {
        customerOptions,
        orderProductOptions,
        incomeCategoryOptions,
        incomeChannelOptions,
        defaultPaymentCategoryId,
        deliveryProviderOptions,
        paymentMethodOptions,
    } = useLookups();

    const [items, setItems] = useState<ItemDraft[]>(() => buildItemDrafts(order));
    const [deliveryCharge, setDeliveryCharge] = useState(order ? String(order.deliveryCharge) : "0");
    const [amountPaidNow, setAmountPaidNow] = useState(order ? String(order.amountPaid) : "0");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const priceOf = (productId: string) => orderProductOptions.find((product) => product.id === productId)?.price ?? 0;
    const paidValue = mode === "edit" ? order?.amountPaid ?? 0 : toNumber(amountPaidNow);
    const totals = orderTotals(
        items.map((item) => ({ subTotal: toNumber(item.subTotal) })),
        toNumber(deliveryCharge),
        paidValue,
    );
    const balanceDue = Math.max(0, totals.totalPrice - paidValue);

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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPending(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        try {
            const problem = await submitOrder({
                customerId: String(formData.get("customerId") || ""),
                orderDate: String(formData.get("orderDate") || ""),
                status: String(formData.get("status")) as OrderStatus,
                items: items.map((item) => ({
                    id: item.id,
                    variantId: item.productId,
                    quantity: parseInt(item.quantity, 10) || 0,
                    subTotal: roundMoney(toNumber(item.subTotal)),
                })),
                deliveryCharge: roundMoney(toNumber(deliveryCharge)),
                deliveryLocation: String(formData.get("deliveryLocation") || "").trim() || null,
                deliveryProviderId: String(formData.get("deliveryProviderId") || "") || null,
                paymentMethodId: String(formData.get("paymentMethodId") || "") || null,
                payment:
                    mode === "new" && paidValue > 0
                        ? {
                            date: String(formData.get("orderDate") || ""),
                            amount: roundMoney(paidValue),
                            categoryId: String(formData.get("paymentCategoryId") || ""),
                            channelId: String(formData.get("paymentChannelId") || "") || null,
                        }
                        : null,
            }, order);
            if (problem) {
                setError(problem);
                setPending(false);
                return;
            }
            router.push(withDateFilter("/orders"));
        } catch (err) {
            console.error("Failed to save order", err);
            setError("Couldn't save the order. Check the details and try again.");
            setPending(false);
        }
    }

    if (mode === "edit" && !order) {
        return (
            <Panel className="p-6">
                <div className="font-condensed text-20 font-semibold">Order not found</div>
                <div className="mt-2 text-13 text-ink/60">That order may have been deleted or the link is stale.</div>
                <Button type="button" variant="outline" onClick={() => router.push(withDateFilter("/orders"))} className="mt-4">
                    Back to orders
                </Button>
            </Panel>
        );
    }

    const title = mode === "edit" && order ? `Edit order ${order.orderNumber}` : "New order";
    const summaryPaidLabel = mode === "new" ? "Amount paid now" : "Amount paid";

    return (
        <form onSubmit={handleSubmit} className="grid gap-4.5 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <Panel className="p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="font-condensed text-28 font-semibold">{title}</div>
                        <div className="mt-1 text-13 text-ink/60">
                            {mode === "new"
                                ? "Create the order, then record an initial payment if the customer pays now."
                                : "Edit the order details. Payments are managed separately from the Transactions page."}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push(withDateFilter("/orders"))}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending ? "Saving…" : "Save order"}
                        </Button>
                    </div>
                </div>

                <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3.5">
                    <div className="grid grid-cols-2 gap-3">
                        {mode === "edit" && order && (
                            <Field>
                                <FieldLabel>Order number</FieldLabel>
                                <div className={readOnlyValueClass}>{order.orderNumber}</div>
                            </Field>
                        )}
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-date`}>Order date</FieldLabel>
                            <Input id={`${fieldId}-date`} type="date" name="orderDate" defaultValue={order ? order.orderDate : todayISO()} required />
                        </Field>
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
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-status`}>Order status</FieldLabel>
                            <NativeSelect id={`${fieldId}-status`} name="status" defaultValue={order ? order.status : "processing"}>
                                <NativeSelectOption value="processing">Processing</NativeSelectOption>
                                <NativeSelectOption value="ready_for_delivery">Ready for delivery</NativeSelectOption>
                                <NativeSelectOption value="out_for_delivery">Out for delivery</NativeSelectOption>
                                <NativeSelectOption value="delivered">Delivered</NativeSelectOption>
                            </NativeSelect>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-location`}>Delivery location (optional)</FieldLabel>
                            <Input
                                id={`${fieldId}-location`}
                                type="text"
                                name="deliveryLocation"
                                defaultValue={order?.deliveryLocation ?? ""}
                                placeholder="Street, area, or landmark"
                            />
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

                    <div>
                        <div className={cn(itemGridClass, "mb-1.25")}>
                            <span className="text-12 text-ink/70">Product</span>
                            <span className="text-12 text-ink/70">Qty</span>
                            <span className="text-12 text-ink/70">Sub-total (Rs)</span>
                            <span />
                        </div>
                        <div className="flex flex-col gap-2">
                            {items.map((item) => {
                                const takenElsewhere = new Set(items.filter((other) => other.id !== item.id).map((other) => other.productId));
                                return (
                                    <div key={item.id} className={itemGridClass}>
                                        <NativeSelect
                                            aria-label="Product"
                                            value={item.productId}
                                            onChange={(event) => updateItem(item.id, { productId: event.target.value })}
                                            required
                                        >
                                            <NativeSelectOption value="">Choose a product…</NativeSelectOption>
                                            {orderProductOptions
                                                .filter((product) => product.id === item.productId || !takenElsewhere.has(product.id))
                                                .map((product) => (
                                                    <NativeSelectOption key={product.id} value={product.id}>
                                                        {product.label} — {fmtMoney(product.price)}
                                                    </NativeSelectOption>
                                                ))}
                                        </NativeSelect>
                                        <Input
                                            type="number"
                                            aria-label="Quantity"
                                            min="1"
                                            step="1"
                                            value={item.quantity}
                                            onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                                            required
                                        />
                                        <Input
                                            type="number"
                                            aria-label="Sub-total"
                                            min="0"
                                            step="0.01"
                                            value={item.subTotal}
                                            onChange={(event) => updateItem(item.id, { subTotal: event.target.value })}
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon-sm"
                                            aria-label="Remove item"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length === 1}
                                            className="disabled:opacity-40"
                                        >
                                            <XIcon strokeWidth={1.5} className="size-3" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        <Button
                            type="button"
                            variant="link"
                            onClick={addItem}
                            disabled={items.length >= orderProductOptions.length}
                            className="mt-2 disabled:opacity-50"
                        >
                            + Add item
                        </Button>
                        {orderProductOptions.length === 0 && <FieldDescription className="mt-1">Add products first, on the Products page.</FieldDescription>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-delivery`}>Delivery charge (Rs)</FieldLabel>
                            <Input
                                id={`${fieldId}-delivery`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={deliveryCharge}
                                onChange={(event) => setDeliveryCharge(event.target.value)}
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor={`${fieldId}-paid`}>{summaryPaidLabel} (Rs)</FieldLabel>
                            {mode === "edit" ? (
                                <div className={readOnlyValueClass}>{fmtMoney(order?.amountPaid ?? 0)}</div>
                            ) : (
                                <Input
                                    id={`${fieldId}-paid`}
                                    type="number"
                                    min="0"
                                    max={totals.totalPrice}
                                    step="0.01"
                                    value={amountPaidNow}
                                    onChange={(event) => setAmountPaidNow(event.target.value)}
                                    required
                                />
                            )}
                        </Field>
                    </div>

                    {mode === "new" && paidValue > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field>
                                <FieldLabel htmlFor={`${fieldId}-pay-category`}>Payment income category</FieldLabel>
                                <NativeSelect id={`${fieldId}-pay-category`} name="paymentCategoryId" defaultValue={defaultPaymentCategoryId} required>
                                    {incomeCategoryOptions.map((category) => (
                                        <NativeSelectOption key={category.id} value={category.id}>
                                            {category.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor={`${fieldId}-pay-channel`}>Payment channel (optional)</FieldLabel>
                                <NativeSelect id={`${fieldId}-pay-channel`} name="paymentChannelId" defaultValue="">
                                    <NativeSelectOption value="">No channel</NativeSelectOption>
                                    {incomeChannelOptions.map((channel) => (
                                        <NativeSelectOption key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                            <FieldDescription className="col-span-2">Recorded as an income transaction dated the order date.</FieldDescription>
                        </div>
                    )}

                    {error && <FieldError>{error}</FieldError>}
                </fieldset>
            </Panel>

            <Panel className="p-6">
                <div className="font-condensed text-20 font-semibold">Order summary</div>
                <div className="mt-3 flex flex-col gap-1.5 border-t border-line-soft pt-3">
                    <div className={summaryRowClass}>
                        <span className="text-ink/60">Sub-total</span>
                        <span>{fmtMoney(totals.subTotal)}</span>
                    </div>
                    <div className={summaryRowClass}>
                        <span className="text-ink/60">Delivery</span>
                        <span>{fmtMoney(toNumber(deliveryCharge))}</span>
                    </div>
                    <div className={cn(summaryRowClass, "font-semibold")}>
                        <span>Total</span>
                        <span>{fmtMoney(totals.totalPrice)}</span>
                    </div>
                    <div className={summaryRowClass}>
                        <span className="text-ink/60">{summaryPaidLabel}</span>
                        <span>{fmtMoney(paidValue)}</span>
                    </div>
                    <div className={summaryRowClass}>
                        <span className="text-ink/60">Balance due</span>
                        <span>{fmtMoney(balanceDue)}</span>
                    </div>
                    <div className={cn(summaryRowClass, "items-center")}>
                        <span className="text-ink/60">Payment status</span>
                        {totals.paymentStatus === "paid" ? (
                            <Badge variant="secondary" className="px-2 py-0.75 text-11">
                                Paid
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="border-accent-800 px-2 py-0.75 text-11 text-accent-800">
                                Partially paid
                            </Badge>
                        )}
                    </div>
                </div>
            </Panel>
        </form>
    );
}
