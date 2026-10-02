import "server-only";
import { orderTotals, roundMoney } from "./calculations";
import type {
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  Invoice,
  Order,
  OrderItem,
  OrderPayment,
  OrderStatus,
  PaymentMethod,
  Product,
  Source,
  Transaction,
  TxnType,
} from "./types";

// Server actions are public POST endpoints: their arguments arrive as untrusted
// data regardless of the TypeScript signatures. These parsers check each field
// and return a fresh object containing only the known columns.

function fail(field: string): never {
  throw new Error(`Invalid ${field}`);
}

function obj(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(field);
  return value as Record<string, unknown>;
}

export function str(value: unknown, field: string, { max = 500, required = false } = {}): string {
  if (typeof value !== "string" || value.length > max) fail(field);
  if (required && value.trim() === "") fail(field);
  return value;
}

export function id(value: unknown, field = "id"): string {
  return str(value, field, { max: 100, required: true });
}

function num(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e12) fail(field);
  return value;
}

function date(value: unknown, field: string): string {
  const s = str(value, field, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) fail(field);
  return s;
}

function txnType(value: unknown): TxnType {
  if (value !== "income" && value !== "expense") fail("type");
  return value;
}

export function parseTransaction(value: unknown): Transaction {
  const v = obj(value, "transaction");
  const type = txnType(v.type);
  return {
    id: id(v.id),
    date: date(v.date, "date"),
    type,
    categoryId: id(v.categoryId, "categoryId"),
    description: str(v.description, "description"),
    amount: num(v.amount, "amount"),
    channelId: v.channelId != null && v.channelId !== "" ? id(v.channelId, "channelId") : null,
    sourceId: type === "expense" && v.sourceId != null && v.sourceId !== "" ? id(v.sourceId, "sourceId") : null,
    customerId: type === "income" && v.customerId != null && v.customerId !== "" ? id(v.customerId, "customerId") : null,
    orderId: type === "income" && v.orderId != null && v.orderId !== "" ? id(v.orderId, "orderId") : null,
  };
}

export function parseBudget(value: unknown): Budget {
  const v = obj(value, "budget");
  return {
    id: id(v.id),
    categoryId: id(v.categoryId, "categoryId"),
    target: num(v.target, "target"),
  };
}

export function parseInvoice(value: unknown): Invoice {
  const v = obj(value, "invoice");
  if (typeof v.paid !== "boolean") fail("paid");
  return {
    id: id(v.id),
    customerId: v.customerId != null && v.customerId !== "" ? id(v.customerId, "customerId") : null,
    issueDate: date(v.issueDate, "issueDate"),
    dueDate: date(v.dueDate, "dueDate"),
    amount: num(v.amount, "amount"),
    paid: v.paid,
  };
}

export function parseCategory(value: unknown): Category {
  const v = obj(value, "category");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
    type: txnType(v.type),
  };
}

export function parseChannel(value: unknown): Channel {
  const v = obj(value, "channel");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
    type: txnType(v.type),
  };
}

export function parseSource(value: unknown): Source {
  const v = obj(value, "source");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}

export function parseDeliveryProvider(value: unknown): DeliveryProvider {
  const v = obj(value, "delivery provider");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  const v = obj(value, "payment method");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}

export function parseProduct(value: unknown): Product {
  const v = obj(value, "product");
  if (v.type !== "lined" && v.type !== "blank") fail("type");
  const quantity = num(v.quantity, "quantity");
  if (!Number.isInteger(quantity)) fail("quantity");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 200, required: true }),
    color: str(v.color, "color", { max: 100, required: true }),
    type: v.type,
    quantity,
    price: num(v.price, "price"),
  };
}

export function parseCustomer(value: unknown): Customer {
  const v = obj(value, "customer");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 200, required: true }),
    company: str(v.company, "company", { max: 200 }),
    email: str(v.email, "email", { max: 320 }),
    phone: str(v.phone, "phone", { max: 50 }),
    notes: str(v.notes, "notes", { max: 5000 }),
  };
}

const ORDER_STATUSES: readonly OrderStatus[] = ["processing", "ready_for_delivery", "out_for_delivery", "delivered"];

// Totals and payment status are recomputed rather than trusted, matching what
// the DB derives, so the returned order is exactly what save_order() stores.
// orderNumber is left out: the DB assigns it and ignores any sent value.
export function parseOrder(value: unknown): Omit<Order, "orderNumber"> {
  const v = obj(value, "order");
  if (!ORDER_STATUSES.includes(v.status as OrderStatus)) fail("status");
  if (!Array.isArray(v.items) || v.items.length === 0 || v.items.length > 200) fail("items");
  const items = v.items.map((raw): OrderItem => {
    const item = obj(raw, "item");
    const quantity = num(item.quantity, "quantity");
    if (!Number.isInteger(quantity) || quantity < 1) fail("quantity");
    return {
      id: id(item.id),
      productId: id(item.productId, "productId"),
      quantity,
      subTotal: roundMoney(num(item.subTotal, "subTotal")),
    };
  });
  if (new Set(items.map((i) => i.productId)).size !== items.length) fail("items");
  const deliveryCharge = roundMoney(num(v.deliveryCharge, "deliveryCharge"));
  const amountPaid = roundMoney(num(v.amountPaid, "amountPaid"));
  const totals = orderTotals(items, deliveryCharge, amountPaid);
  if (amountPaid > totals.totalPrice) fail("amountPaid");
  return {
    id: id(v.id),
    customerId: id(v.customerId, "customerId"),
    orderDate: date(v.orderDate, "orderDate"),
    status: v.status as OrderStatus,
    items,
    deliveryCharge,
    deliveryProviderId: v.deliveryProviderId != null && v.deliveryProviderId !== "" ? id(v.deliveryProviderId, "deliveryProviderId") : null,
    paymentMethodId: v.paymentMethodId != null && v.paymentMethodId !== "" ? id(v.paymentMethodId, "paymentMethodId") : null,
    amountPaid,
    ...totals,
  };
}

export function parseOrderPayment(value: unknown): OrderPayment {
  const v = obj(value, "payment");
  const amount = roundMoney(num(v.amount, "amount"));
  if (amount <= 0) fail("amount");
  return {
    id: id(v.id),
    date: date(v.date, "date"),
    amount,
    categoryId: id(v.categoryId, "categoryId"),
    channelId: v.channelId != null && v.channelId !== "" ? id(v.channelId, "channelId") : null,
  };
}
