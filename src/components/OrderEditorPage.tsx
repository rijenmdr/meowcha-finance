"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDashboardData, useFinance } from "@/lib/finance-context";
import { orderTotals, roundMoney } from "@/lib/calculations";
import { cx } from "@/lib/cx";
import { fmtMoney } from "@/lib/format";
import { TODAY } from "@/lib/mock-data";
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
const toNumber = (v: string) => parseFloat(v) || 0;

function buildItemDrafts(order: Order | null): ItemDraft[] {
    return order
        ? order.items.map((item) => ({ id: item.id, productId: item.variantId, quantity: String(item.quantity), subTotal: String(item.subTotal) }))
        : [{ id: crypto.randomUUID(), productId: "", quantity: "1", subTotal: "" }];
}

export function OrderEditorPage({ mode, orderId }: { mode: "new" | "edit"; orderId?: string }) {
    const router = useRouter();
    const { submitOrder, state } = useFinance();
    const {
        customerOptions,
        orderProductOptions,
        incomeCategoryOptions,
        incomeChannelOptions,
        defaultPaymentCategoryId,
        deliveryProviderOptions,
        paymentMethodOptions,
    } = useDashboardData();
    const order = useMemo(() => (mode === "edit" && orderId ? state.orders.find((item) => item.id === orderId) ?? null : null), [mode, orderId, state.orders]);

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
                id: order?.id,
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
            });
            if (problem) {
                setError(problem);
                setPending(false);
                return;
            }
            router.push("/orders");
            router.refresh();
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
                <button type="button" onClick={() => router.push("/orders")} className="mt-4 cursor-pointer border border-line px-4 py-2 font-condensed text-14 font-semibold">
                    Back to orders
                </button>
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
                        <button type="button" onClick={() => router.push("/orders")} className="cursor-pointer border border-line bg-transparent px-4 py-2 font-condensed text-14 font-semibold">
                            Cancel
                        </button>
                        <button type="submit" disabled={pending} className="cursor-pointer border border-accent-500 bg-accent-500 px-4 py-2 font-condensed text-14 font-semibold text-canvas disabled:cursor-default disabled:opacity-70">
                            {pending ? "Saving…" : "Save order"}
                        </button>
                    </div>
                </div>

                <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3.5">
                    <div className="grid grid-cols-2 gap-3">
                        {mode === "edit" && order && (
                            <div>
                                <label className="mb-1.25 block text-12 text-ink/70">Order number</label>
                                <div className={cx("min-h-9 border border-line bg-surface px-2.5 py-1.5 text-14 text-ink/60", "flex items-center")}>{order.orderNumber}</div>
                            </div>
                        )}
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Order date</label>
                            <input type="date" name="orderDate" defaultValue={order ? order.orderDate : TODAY} required className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Customer</label>
                            <select name="customerId" defaultValue={order?.customerId ?? ""} required className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                <option value="" disabled>
                                    Choose a customer…
                                </option>
                                {customerOptions.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                            {customerOptions.length === 0 && <div className="mt-1 text-11 text-ink/60">Add a customer first, on the Customers page.</div>}
                        </div>
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Order status</label>
                            <select name="status" defaultValue={order ? order.status : "processing"} className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                <option value="processing">Processing</option>
                                <option value="ready_for_delivery">Ready for delivery</option>
                                <option value="out_for_delivery">Out for delivery</option>
                                <option value="delivered">Delivered</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Delivery location (optional)</label>
                            <input
                                type="text"
                                name="deliveryLocation"
                                defaultValue={order?.deliveryLocation ?? ""}
                                className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
                                placeholder="Street, area, or landmark"
                            />
                        </div>
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Delivery provider (optional)</label>
                            <select name="deliveryProviderId" defaultValue={order?.deliveryProviderId ?? ""} className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                <option value="">No provider</option>
                                {deliveryProviderOptions.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.name}
                                    </option>
                                ))}
                            </select>
                            {deliveryProviderOptions.length === 0 && <div className="mt-1 text-11 text-ink/60">No providers yet. Add one on the Delivery providers page.</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Payment method (optional)</label>
                            <select name="paymentMethodId" defaultValue={order?.paymentMethodId ?? ""} className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                <option value="">No method</option>
                                {paymentMethodOptions.map((method) => (
                                    <option key={method.id} value={method.id}>
                                        {method.name}
                                    </option>
                                ))}
                            </select>
                            {paymentMethodOptions.length === 0 && <div className="mt-1 text-11 text-ink/60">No methods yet. Add one on the Payment methods page.</div>}
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
                                const takenElsewhere = new Set(items.filter((other) => other.id !== item.id).map((other) => other.productId));
                                return (
                                    <div key={item.id} className={itemGridClass}>
                                        <select
                                            aria-label="Product"
                                            value={item.productId}
                                            onChange={(event) => updateItem(item.id, { productId: event.target.value })}
                                            required
                                            className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
                                        >
                                            <option value="">Choose a product…</option>
                                            {orderProductOptions
                                                .filter((product) => product.id === item.productId || !takenElsewhere.has(product.id))
                                                .map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.label} — {fmtMoney(product.price)}
                                                    </option>
                                                ))}
                                        </select>
                                        <input
                                            type="number"
                                            aria-label="Quantity"
                                            min="1"
                                            step="1"
                                            value={item.quantity}
                                            onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                                            required
                                            className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
                                        />
                                        <input
                                            type="number"
                                            aria-label="Sub-total"
                                            min="0"
                                            step="0.01"
                                            value={item.subTotal}
                                            onChange={(event) => updateItem(item.id, { subTotal: event.target.value })}
                                            required
                                            className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
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
                        {orderProductOptions.length === 0 && <div className="mt-1 text-11 text-ink/60">Add products first, on the Products page.</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">Delivery charge (Rs)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={deliveryCharge}
                                onChange={(event) => setDeliveryCharge(event.target.value)}
                                required
                                className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
                            />
                        </div>
                        <div>
                            <label className="mb-1.25 block text-12 text-ink/70">{summaryPaidLabel} (Rs)</label>
                            {mode === "edit" ? (
                                <div className="min-h-9 flex items-center border border-line bg-surface px-2.5 py-1.5 text-14 text-ink/60">{fmtMoney(order?.amountPaid ?? 0)}</div>
                            ) : (
                                <input
                                    type="number"
                                    min="0"
                                    max={totals.totalPrice}
                                    step="0.01"
                                    value={amountPaidNow}
                                    onChange={(event) => setAmountPaidNow(event.target.value)}
                                    required
                                    className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14"
                                />
                            )}
                        </div>
                    </div>

                    {mode === "new" && paidValue > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1.25 block text-12 text-ink/70">Payment income category</label>
                                <select name="paymentCategoryId" defaultValue={defaultPaymentCategoryId} required className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                    {incomeCategoryOptions.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.25 block text-12 text-ink/70">Payment channel (optional)</label>
                                <select name="paymentChannelId" defaultValue="" className="min-h-9 w-full border border-line bg-surface px-2.5 py-1.5 text-14">
                                    <option value="">No channel</option>
                                    {incomeChannelOptions.map((channel) => (
                                        <option key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 mt-0 text-11 text-ink/60">Recorded as an income transaction dated the order date.</div>
                        </div>
                    )}

                    {error && <div role="alert" className="text-13 text-error">{error}</div>}
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
                    <div className={cx(summaryRowClass, "font-semibold")}>
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
                    <div className={cx(summaryRowClass, "items-center")}>
                        <span className="text-ink/60">Payment status</span>
                        <span className={cx("px-2 py-0.75 text-11", totals.paymentStatus === "paid" ? "bg-accent-50 text-accent-700" : "border border-accent-800 text-accent-800")}>
                            {totals.paymentStatus === "paid" ? "Paid" : "Partially paid"}
                        </span>
                    </div>
                </div>
            </Panel>
        </form>
    );
}
