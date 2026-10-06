"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TODAY } from "./mock-data";
import { addDays, daysBetween, fmtDate, fmtMoney, inRange, monthsBetweenInclusive } from "./format";
import {
  buildCategoryBreakdown,
  buildChartData,
  buildMonthAgg,
  adjustOrderPaymentIncome,
  deltaBits,
  orderPaymentTransaction,
  orderTotals,
  roundMoney,
  syncOrderPayments,
} from "./calculations";
import {
  deleteBudgetAction,
  deleteCategoryAction,
  deleteChannelAction,
  deleteCustomerAction,
  deleteDeliveryProviderAction,
  deleteInvoiceAction,
  deleteOrderAction,
  deletePaymentMethodAction,
  deleteProductAction,
  deleteSourceAction,
  deleteTransactionAction,
  saveBudgetAction,
  saveCategoryAction,
  saveChannelAction,
  saveCustomerAction,
  saveDeliveryProviderAction,
  saveInvoiceAction,
  recordOrderPaymentAction,
  saveOrderAction,
  savePaymentMethodAction,
  saveProductAction,
  saveSourceAction,
  saveTransactionAction,
} from "./actions";
import type {
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  DialogKind,
  Invoice,
  Order,
  OrderItem,
  OrderPayment,
  OrderStatus,
  PaperType,
  PaymentMethod,
  PaymentStatus,
  Product,
  Source,
  Transaction,
  TxnType,
} from "./types";

interface FinanceState {
  dateStart: string;
  dateEnd: string;
  filterType: "all" | TxnType;
  filterCategory: string;
  dialog: DialogKind;
  editId: string | null;
  txnFormType: TxnType;
  transactions: Transaction[];
  budgets: Budget[];
  invoices: Invoice[];
  customers: Customer[];
  categories: Category[];
  channels: Channel[];
  sources: Source[];
  products: Product[];
  orders: Order[];
  deliveryProviders: DeliveryProvider[];
  paymentMethods: PaymentMethod[];
}

interface TxnSubmitValues {
  date: string;
  amount: number;
  categoryId: string;
  description: string;
  channelId: string | null;
  sourceId: string | null;
  customerId: string | null;
}

interface BudgetSubmitValues {
  categoryId: string;
  target: number;
}

interface InvoiceSubmitValues {
  customerId: string | null;
  issueDate: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}

interface CategorySubmitValues {
  name: string;
  type: TxnType;
}

interface ChannelSubmitValues {
  name: string;
  type: TxnType;
}

interface SourceSubmitValues {
  name: string;
}

interface DeliveryProviderSubmitValues {
  name: string;
}

interface PaymentMethodSubmitValues {
  name: string;
}

interface ProductSubmitValues {
  name: string;
  color: string;
  type: PaperType;
  quantity: number;
  price: number;
}

interface CustomerSubmitValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

interface OrderSubmitValues {
  id?: string;
  customerId: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  deliveryCharge: number;
  deliveryLocation: string | null;
  deliveryProviderId: string | null;
  paymentMethodId: string | null;
  payment: PaymentSubmitValues | null; // new orders only; later payments go through submitPayment
}

type PaymentSubmitValues = Omit<OrderPayment, "id">;

interface FinanceContextValue {
  state: FinanceState;
  setDateStart: (v: string) => void;
  setDateEnd: (v: string) => void;
  presetMonth: () => void;
  presetQuarter: () => void;
  presetYTD: () => void;
  presetAll: () => void;
  setFilterType: (v: "all" | TxnType) => void;
  setFilterCategory: (v: string) => void;

  closeDialog: () => void;
  openAddTxn: () => void;
  openEditTxn: (id: string) => void;
  deleteTxn: (id: string) => void;
  setTxnFormType: (t: TxnType) => void;
  submitTxn: (values: TxnSubmitValues) => Promise<void>;

  openAddBudget: () => void;
  openEditBudget: (id: string) => void;
  deleteBudget: (id: string) => void;
  submitBudget: (values: BudgetSubmitValues) => Promise<void>;

  openAddInvoice: () => void;
  openEditInvoice: (id: string) => void;
  deleteInvoice: (id: string) => void;
  markInvoicePaid: (id: string) => void;
  submitInvoice: (values: InvoiceSubmitValues) => Promise<void>;

  openAddCustomer: () => void;
  openEditCustomer: (id: string) => void;
  deleteCustomer: (id: string) => void;
  submitCustomer: (values: CustomerSubmitValues) => Promise<void>;

  openAddCategory: (type?: TxnType) => void;
  openEditCategory: (id: string) => void;
  deleteCategory: (id: string) => void;
  submitCategory: (values: CategorySubmitValues) => Promise<void>;

  openAddChannel: (type?: TxnType) => void;
  openEditChannel: (id: string) => void;
  deleteChannel: (id: string) => void;
  submitChannel: (values: ChannelSubmitValues) => Promise<void>;

  openAddSource: () => void;
  openEditSource: (id: string) => void;
  deleteSource: (id: string) => void;
  submitSource: (values: SourceSubmitValues) => Promise<void>;

  openAddDeliveryProvider: () => void;
  openEditDeliveryProvider: (id: string) => void;
  deleteDeliveryProvider: (id: string) => void;
  submitDeliveryProvider: (values: DeliveryProviderSubmitValues) => Promise<void>;

  openAddPaymentMethod: () => void;
  openEditPaymentMethod: (id: string) => void;
  deletePaymentMethod: (id: string) => void;
  submitPaymentMethod: (values: PaymentMethodSubmitValues) => Promise<void>;

  openAddProduct: () => void;
  openEditProduct: (id: string) => void;
  deleteProduct: (id: string) => void;
  submitProduct: (values: ProductSubmitValues) => Promise<void>;

  openAddOrder: () => void;
  openEditOrder: (id: string) => void;
  deleteOrder: (id: string) => void;
  advanceOrderStatus: (id: string) => void;
  openRecordPayment: (orderId: string) => void;
  submitPayment: (values: PaymentSubmitValues) => Promise<void>;
  submitOrder: (values: OrderSubmitValues) => Promise<void>;
}

const STATUS_CLASSES = {
  Paid: "bg-accent-50 text-accent-700",
  Overdue: "border border-accent-800 text-accent-800",
  Outstanding: "border border-ink/30 text-muted",
} as const;

export const PAPER_TYPE_LABELS: Record<PaperType, string> = { lined: "Lined", blank: "Blank" };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  processing: "border border-ink/30 text-muted",
  ready_for_delivery: "bg-mist text-graphite",
  out_for_delivery: "border border-accent-500 text-accent-700",
  delivered: "bg-accent-50 text-accent-700",
};

// The table's one-click step forward, with the button label for that step.
const NEXT_ORDER_STATUS: Record<OrderStatus, { status: OrderStatus; label: string } | null> = {
  processing: { status: "ready_for_delivery", label: "Mark ready" },
  ready_for_delivery: { status: "out_for_delivery", label: "Send out" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
  delivered: null,
};

function getAllDataDateBounds(transactions: Transaction[], invoices: Invoice[], orders: Order[]) {
  const dates = [
    ...transactions.map((t) => t.date),
    ...invoices.map((i) => i.issueDate),
    ...orders.map((o) => o.orderDate),
  ];
  if (dates.length === 0) {
    return { start: "2026-01-01", end: TODAY };
  }
  dates.sort((a, b) => a.localeCompare(b));
  return { start: dates[0]!, end: dates[dates.length - 1]! };
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = { paid: "Paid", partially_paid: "Partially paid" };

export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  paid: "bg-accent-50 text-accent-700",
  partially_paid: "border border-accent-800 text-accent-800",
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

interface FinanceProviderProps {
  children: ReactNode;
  initialTransactions: Transaction[];
  initialBudgets: Budget[];
  initialInvoices: Invoice[];
  initialCustomers: Customer[];
  initialCategories: Category[];
  initialChannels: Channel[];
  initialSources: Source[];
  initialProducts: Product[];
  initialOrders: Order[];
  initialDeliveryProviders: DeliveryProvider[];
  initialPaymentMethods: PaymentMethod[];
}

export function FinanceProvider({
  children,
  initialTransactions,
  initialBudgets,
  initialInvoices,
  initialCustomers,
  initialCategories,
  initialChannels,
  initialSources,
  initialProducts,
  initialOrders,
  initialDeliveryProviders,
  initialPaymentMethods,
}: FinanceProviderProps) {
  const router = useRouter();
  const allDataBounds = getAllDataDateBounds(initialTransactions, initialInvoices, initialOrders);

  // Random rather than a per-session counter: a counter restarts on every page
  // load, so a new record could reuse (and upsert over) an id saved earlier.
  const uid = () => crypto.randomUUID();

  const [state, setState] = useState<FinanceState>({
    dateStart: allDataBounds.start,
    dateEnd: allDataBounds.end,
    filterType: "all",
    filterCategory: "all",
    dialog: null,
    editId: null,
    txnFormType: "expense",
    transactions: initialTransactions,
    budgets: initialBudgets,
    invoices: initialInvoices,
    customers: initialCustomers,
    categories: initialCategories,
    channels: initialChannels,
    sources: initialSources,
    products: initialProducts,
    orders: initialOrders,
    deliveryProviders: initialDeliveryProviders,
    paymentMethods: initialPaymentMethods,
  });

  // Mutation callbacks below are memoized with an empty deps array, so they
  // can't read `state` from their closure (it would be frozen at mount).
  // This ref mirrors the latest state on every render instead, so a callback
  // can read current records synchronously before persisting to Supabase.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setDateStart = useCallback((v: string) => setState((s) => ({ ...s, dateStart: v })), []);
  const setDateEnd = useCallback((v: string) => setState((s) => ({ ...s, dateEnd: v })), []);
  const presetMonth = useCallback(() => setState((s) => ({ ...s, dateStart: "2026-09-01", dateEnd: TODAY })), []);
  const presetQuarter = useCallback(() => setState((s) => ({ ...s, dateStart: "2026-07-01", dateEnd: TODAY })), []);
  const presetYTD = useCallback(() => setState((s) => ({ ...s, dateStart: "2026-01-01", dateEnd: TODAY })), []);
  const presetAll = useCallback(
    () =>
      setState((s) => {
        const bounds = getAllDataDateBounds(s.transactions, s.invoices, s.orders);
        return { ...s, dateStart: bounds.start, dateEnd: bounds.end };
      }),
    [],
  );
  // The category list depends on the type, so the selected category may no longer apply.
  const setFilterType = useCallback((v: "all" | TxnType) => setState((s) => ({ ...s, filterType: v, filterCategory: "all" })), []);
  const setFilterCategory = useCallback((v: string) => setState((s) => ({ ...s, filterCategory: v })), []);

  const closeDialog = useCallback(() => setState((s) => ({ ...s, dialog: null, editId: null })), []);

  const openAddTxn = useCallback(
    () => setState((s) => ({ ...s, dialog: "txn", editId: null, txnFormType: "expense" })),
    [],
  );
  const openEditTxn = useCallback(
    (id: string) =>
      setState((s) => {
        const t = s.transactions.find((x) => x.id === id);
        return { ...s, dialog: "txn", editId: id, txnFormType: t ? t.type : "expense" };
      }),
    [],
  );
  const deleteTxn = useCallback((id: string) => {
    const s = stateRef.current;
    const t = s.transactions.find((x) => x.id === id);
    const order = t?.orderId ? s.orders.find((o) => o.id === t.orderId) : undefined;
    const note = order ? ` It's a payment for ${order.orderNumber}, so that order's amount paid will drop.` : "";
    if (!window.confirm(`Delete this transaction?${note}`)) return;
    // The DB trigger recomputes the order's amount_paid; this mirrors it.
    setState((s) => {
      const transactions = s.transactions.filter((t) => t.id !== id);
      return { ...s, transactions, orders: syncOrderPayments(s.orders, transactions) };
    });
    deleteTransactionAction(id).catch((err) => console.error("Failed to delete transaction", err));
  }, []);
  const setTxnFormType = useCallback((t: TxnType) => setState((s) => ({ ...s, txnFormType: t })), []);
  const submitTxn = useCallback(async (values: TxnSubmitValues) => {
    const s = stateRef.current;
    const existing = s.editId ? s.transactions.find((t) => t.id === s.editId) : undefined;
    const rec: Transaction = {
      id: existing?.id ?? uid(),
      date: values.date,
      type: s.txnFormType,
      categoryId: values.categoryId,
      description: values.description,
      channelId: values.channelId,
      sourceId: s.txnFormType === "expense" ? values.sourceId : null,
      amount: Math.abs(values.amount || 0),
      customerId: s.txnFormType === "income" ? values.customerId : null,
      // The dialog doesn't edit the order link; it only survives while this stays income.
      orderId: s.txnFormType === "income" ? (existing?.orderId ?? null) : null,
    };
    await saveTransactionAction(rec);
    setState((s) => {
      const exists = s.transactions.some((t) => t.id === rec.id);
      const transactions = exists ? s.transactions.map((t) => (t.id === rec.id ? rec : t)) : [...s.transactions, rec];
      return { ...s, transactions, orders: syncOrderPayments(s.orders, transactions), dialog: null, editId: null };
    });
  }, []);

  const openAddBudget = useCallback(() => setState((s) => ({ ...s, dialog: "budget", editId: null })), []);
  const openEditBudget = useCallback((id: string) => setState((s) => ({ ...s, dialog: "budget", editId: id })), []);
  const deleteBudget = useCallback((id: string) => {
    if (!window.confirm("Remove this budget category?")) return;
    setState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) }));
    deleteBudgetAction(id).catch((err) => console.error("Failed to delete budget", err));
  }, []);
  const submitBudget = useCallback(async (values: BudgetSubmitValues) => {
    const s = stateRef.current;
    const target = Math.abs(values.target || 0);
    let rec: Budget;
    if (s.editId) {
      rec = { id: s.editId, categoryId: s.budgets.find((b) => b.id === s.editId)?.categoryId ?? values.categoryId, target };
    } else {
      const existing = s.budgets.find((b) => b.categoryId === values.categoryId);
      rec = existing ? { ...existing, target } : { id: uid(), categoryId: values.categoryId, target };
    }
    await saveBudgetAction(rec);
    setState((s) => {
      const exists = s.budgets.some((b) => b.id === rec.id);
      const budgets = exists ? s.budgets.map((b) => (b.id === rec.id ? rec : b)) : [...s.budgets, rec];
      return { ...s, budgets, dialog: null, editId: null };
    });
  }, []);

  const openAddInvoice = useCallback(() => setState((s) => ({ ...s, dialog: "invoice", editId: null })), []);
  const openEditInvoice = useCallback((id: string) => setState((s) => ({ ...s, dialog: "invoice", editId: id })), []);
  const deleteInvoice = useCallback((id: string) => {
    if (!window.confirm("Delete this invoice?")) return;
    setState((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }));
    deleteInvoiceAction(id).catch((err) => console.error("Failed to delete invoice", err));
  }, []);
  const markInvoicePaid = useCallback((id: string) => {
    const existing = stateRef.current.invoices.find((i) => i.id === id);
    if (!existing) return;
    const rec: Invoice = { ...existing, paid: true };
    setState((s) => ({ ...s, invoices: s.invoices.map((i) => (i.id === id ? rec : i)) }));
    saveInvoiceAction(rec).catch((err) => console.error("Failed to save invoice", err));
  }, []);
  const submitInvoice = useCallback(async (values: InvoiceSubmitValues) => {
    const s = stateRef.current;
    const rec: Invoice = {
      id: s.editId || uid(),
      customerId: values.customerId,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      amount: Math.abs(values.amount || 0),
      paid: values.paid,
    };
    await saveInvoiceAction(rec);
    setState((s) => {
      const exists = s.invoices.some((i) => i.id === rec.id);
      const invoices = exists ? s.invoices.map((i) => (i.id === rec.id ? rec : i)) : [...s.invoices, rec];
      return { ...s, invoices, dialog: null, editId: null };
    });
  }, []);

  const openAddCustomer = useCallback(() => setState((s) => ({ ...s, dialog: "customer", editId: null })), []);
  const openEditCustomer = useCallback((id: string) => setState((s) => ({ ...s, dialog: "customer", editId: id })), []);
  const deleteCustomer = useCallback((id: string) => {
    const s = stateRef.current;
    const customer = s.customers.find((c) => c.id === id);
    if (!customer) return;
    // Every order needs a customer, so orders.customer_id has no on-delete action.
    const orderCount = s.orders.filter((o) => o.customerId === id).length;
    if (orderCount > 0) {
      window.alert(`"${customer.name}" has ${orderCount} order${orderCount === 1 ? "" : "s"}. Delete those first.`);
      return;
    }
    if (!window.confirm("Delete this customer? Linked income and invoices stay, but are unlinked.")) return;
    // Mirrors the DB's `on delete set null` on transactions.customer_id and invoices.customer_id.
    setState((s) => ({
      ...s,
      customers: s.customers.filter((c) => c.id !== id),
      transactions: s.transactions.map((t) => (t.customerId === id ? { ...t, customerId: null } : t)),
      invoices: s.invoices.map((i) => (i.customerId === id ? { ...i, customerId: null } : i)),
    }));
    deleteCustomerAction(id).catch((err) => console.error("Failed to delete customer", err));
  }, []);
  const submitCustomer = useCallback(async (values: CustomerSubmitValues) => {
    const s = stateRef.current;
    const rec: Customer = { id: s.editId || uid(), ...values };
    await saveCustomerAction(rec);
    setState((s) => {
      const exists = s.customers.some((c) => c.id === rec.id);
      const customers = exists ? s.customers.map((c) => (c.id === rec.id ? rec : c)) : [...s.customers, rec];
      customers.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, customers, dialog: null, editId: null };
    });
  }, []);

  // The category dialog reuses txnFormType as its default type selection.
  const openAddCategory = useCallback(
    (type: TxnType = "expense") => setState((s) => ({ ...s, dialog: "category", editId: null, txnFormType: type })),
    [],
  );
  const openEditCategory = useCallback((id: string) => setState((s) => ({ ...s, dialog: "category", editId: id })), []);
  const deleteCategory = useCallback((id: string) => {
    const s = stateRef.current;
    const cat = s.categories.find((c) => c.id === id);
    if (!cat) return;
    const txnCount = s.transactions.filter((t) => t.categoryId === id).length;
    const hasBudget = s.budgets.some((b) => b.categoryId === id);
    if (txnCount > 0 || hasBudget) {
      const uses = [txnCount > 0 && `${txnCount} transaction${txnCount === 1 ? "" : "s"}`, hasBudget && "a budget"].filter(Boolean);
      window.alert(`"${cat.name}" is used by ${uses.join(" and ")}. Reassign or remove those first, or rename the category instead.`);
      return;
    }
    if (!window.confirm(`Delete the "${cat.name}" category?`)) return;
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
    deleteCategoryAction(id).catch((err) => console.error("Failed to delete category", err));
  }, []);
  const submitCategory = useCallback(async (values: CategorySubmitValues) => {
    const s = stateRef.current;
    const existing = s.editId ? s.categories.find((c) => c.id === s.editId) : undefined;
    const rec: Category = { id: existing?.id ?? uid(), name: values.name, type: existing?.type ?? values.type };
    const duplicate = s.categories.some(
      (c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase(),
    );
    if (duplicate) {
      window.alert(`There's already a ${rec.type} category called "${rec.name}".`);
      return;
    }
    await saveCategoryAction(rec);
    setState((s) => {
      const exists = s.categories.some((c) => c.id === rec.id);
      const categories = exists ? s.categories.map((c) => (c.id === rec.id ? rec : c)) : [...s.categories, rec];
      categories.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, categories, dialog: null, editId: null };
    });
  }, []);

  // Like categories, the channel dialog reuses txnFormType as its default type.
  const openAddChannel = useCallback(
    (type: TxnType = "income") => setState((s) => ({ ...s, dialog: "channel", editId: null, txnFormType: type })),
    [],
  );
  const openEditChannel = useCallback((id: string) => setState((s) => ({ ...s, dialog: "channel", editId: id })), []);
  const deleteChannel = useCallback((id: string) => {
    const s = stateRef.current;
    const ch = s.channels.find((c) => c.id === id);
    if (!ch) return;
    const txnCount = s.transactions.filter((t) => t.channelId === id).length;
    const usage = txnCount > 0 ? ` ${txnCount} transaction${txnCount === 1 ? "" : "s"} will be unlinked.` : "";
    if (!window.confirm(`Delete the "${ch.name}" channel?${usage}`)) return;
    // Mirrors the DB's `on delete set null (channel_id)` on transactions.
    setState((s) => ({
      ...s,
      channels: s.channels.filter((c) => c.id !== id),
      transactions: s.transactions.map((t) => (t.channelId === id ? { ...t, channelId: null } : t)),
    }));
    deleteChannelAction(id).catch((err) => console.error("Failed to delete channel", err));
  }, []);
  const submitChannel = useCallback(async (values: ChannelSubmitValues) => {
    const s = stateRef.current;
    const existing = s.editId ? s.channels.find((c) => c.id === s.editId) : undefined;
    const rec: Channel = { id: existing?.id ?? uid(), name: values.name, type: existing?.type ?? values.type };
    const duplicate = s.channels.some(
      (c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase(),
    );
    if (duplicate) {
      window.alert(`There's already a ${rec.type} channel called "${rec.name}".`);
      return;
    }
    await saveChannelAction(rec);
    setState((s) => {
      const exists = s.channels.some((c) => c.id === rec.id);
      const channels = exists ? s.channels.map((c) => (c.id === rec.id ? rec : c)) : [...s.channels, rec];
      channels.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, channels, dialog: null, editId: null };
    });
  }, []);

  const openAddSource = useCallback(() => setState((s) => ({ ...s, dialog: "source", editId: null })), []);
  const openEditSource = useCallback((id: string) => setState((s) => ({ ...s, dialog: "source", editId: id })), []);
  const deleteSource = useCallback((id: string) => {
    const s = stateRef.current;
    const src = s.sources.find((x) => x.id === id);
    if (!src) return;
    const txnCount = s.transactions.filter((t) => t.sourceId === id).length;
    const usage = txnCount > 0 ? ` ${txnCount} expense${txnCount === 1 ? "" : "s"} will be unlinked.` : "";
    if (!window.confirm(`Delete the "${src.name}" source?${usage}`)) return;
    // Mirrors the DB's `on delete set null (source_id)` on transactions.
    setState((s) => ({
      ...s,
      sources: s.sources.filter((x) => x.id !== id),
      transactions: s.transactions.map((t) => (t.sourceId === id ? { ...t, sourceId: null } : t)),
    }));
    deleteSourceAction(id).catch((err) => console.error("Failed to delete source", err));
  }, []);
  const submitSource = useCallback(async (values: SourceSubmitValues) => {
    const s = stateRef.current;
    const rec: Source = { id: s.editId || uid(), name: values.name };
    // Mirrors the DB's unique (name), but case-insensitively.
    const duplicate = s.sources.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      window.alert(`There's already a source called "${rec.name}".`);
      return;
    }
    await saveSourceAction(rec);
    setState((s) => {
      const exists = s.sources.some((x) => x.id === rec.id);
      const sources = exists ? s.sources.map((x) => (x.id === rec.id ? rec : x)) : [...s.sources, rec];
      sources.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, sources, dialog: null, editId: null };
    });
  }, []);

  const openAddDeliveryProvider = useCallback(() => setState((s) => ({ ...s, dialog: "deliveryProvider", editId: null })), []);
  const openEditDeliveryProvider = useCallback(
    (id: string) => setState((s) => ({ ...s, dialog: "deliveryProvider", editId: id })),
    [],
  );
  const deleteDeliveryProvider = useCallback((id: string) => {
    const s = stateRef.current;
    const provider = s.deliveryProviders.find((x) => x.id === id);
    if (!provider) return;
    const orderCount = s.orders.filter((o) => o.deliveryProviderId === id).length;
    const usage = orderCount > 0 ? ` ${orderCount} order${orderCount === 1 ? "" : "s"} will be unlinked.` : "";
    if (!window.confirm(`Delete the "${provider.name}" delivery provider?${usage}`)) return;
    // Mirrors the DB's `on delete set null` on orders.delivery_provider_id.
    setState((s) => ({
      ...s,
      deliveryProviders: s.deliveryProviders.filter((x) => x.id !== id),
      orders: s.orders.map((o) => (o.deliveryProviderId === id ? { ...o, deliveryProviderId: null } : o)),
    }));
    deleteDeliveryProviderAction(id).catch((err) => console.error("Failed to delete delivery provider", err));
  }, []);
  const submitDeliveryProvider = useCallback(async (values: DeliveryProviderSubmitValues) => {
    const s = stateRef.current;
    const rec: DeliveryProvider = { id: s.editId || uid(), name: values.name };
    // Mirrors the DB's unique (name), but case-insensitively.
    const duplicate = s.deliveryProviders.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      window.alert(`There's already a delivery provider called "${rec.name}".`);
      return;
    }
    await saveDeliveryProviderAction(rec);
    setState((s) => {
      const exists = s.deliveryProviders.some((x) => x.id === rec.id);
      const deliveryProviders = exists ? s.deliveryProviders.map((x) => (x.id === rec.id ? rec : x)) : [...s.deliveryProviders, rec];
      deliveryProviders.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, deliveryProviders, dialog: null, editId: null };
    });
  }, []);

  const openAddPaymentMethod = useCallback(() => setState((s) => ({ ...s, dialog: "paymentMethod", editId: null })), []);
  const openEditPaymentMethod = useCallback((id: string) => setState((s) => ({ ...s, dialog: "paymentMethod", editId: id })), []);
  const deletePaymentMethod = useCallback((id: string) => {
    const s = stateRef.current;
    const method = s.paymentMethods.find((x) => x.id === id);
    if (!method) return;
    const orderCount = s.orders.filter((o) => o.paymentMethodId === id).length;
    const usage = orderCount > 0 ? ` ${orderCount} order${orderCount === 1 ? "" : "s"} will be unlinked.` : "";
    if (!window.confirm(`Delete the "${method.name}" payment method?${usage}`)) return;
    // Mirrors the DB's `on delete set null` on orders.payment_method_id.
    setState((s) => ({
      ...s,
      paymentMethods: s.paymentMethods.filter((x) => x.id !== id),
      orders: s.orders.map((o) => (o.paymentMethodId === id ? { ...o, paymentMethodId: null } : o)),
    }));
    deletePaymentMethodAction(id).catch((err) => console.error("Failed to delete payment method", err));
  }, []);
  const submitPaymentMethod = useCallback(async (values: PaymentMethodSubmitValues) => {
    const s = stateRef.current;
    const rec: PaymentMethod = { id: s.editId || uid(), name: values.name };
    const duplicate = s.paymentMethods.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
    if (duplicate) {
      window.alert(`There's already a payment method called "${rec.name}".`);
      return;
    }
    await savePaymentMethodAction(rec);
    setState((s) => {
      const exists = s.paymentMethods.some((x) => x.id === rec.id);
      const paymentMethods = exists ? s.paymentMethods.map((x) => (x.id === rec.id ? rec : x)) : [...s.paymentMethods, rec];
      paymentMethods.sort((a, b) => a.name.localeCompare(b.name));
      return { ...s, paymentMethods, dialog: null, editId: null };
    });
  }, []);

  const openAddProduct = useCallback(() => setState((s) => ({ ...s, dialog: "product", editId: null })), []);
  const openEditProduct = useCallback((id: string) => setState((s) => ({ ...s, dialog: "product", editId: id })), []);
  const deleteProduct = useCallback((id: string) => {
    const s = stateRef.current;
    const p = s.products.find((x) => x.id === id);
    if (!p) return;
    // order_items.product_id has no on-delete action, so the DB would reject this.
    const orderCount = s.orders.filter((o) => o.items.some((i) => i.productId === id)).length;
    if (orderCount > 0) {
      window.alert(`"${p.name}" (${p.color}, ${p.type}) is on ${orderCount} order${orderCount === 1 ? "" : "s"}. Remove it from those first.`);
      return;
    }
    if (!window.confirm(`Delete "${p.name}" (${p.color}, ${p.type})?`)) return;
    setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== id) }));
    deleteProductAction(id).catch((err) => console.error("Failed to delete product", err));
  }, []);
  const submitProduct = useCallback(async (values: ProductSubmitValues) => {
    const s = stateRef.current;
    const rec: Product = {
      id: s.editId || uid(),
      name: values.name,
      color: values.color,
      type: values.type,
      quantity: Math.max(0, Math.trunc(values.quantity || 0)),
      price: Math.abs(values.price || 0),
    };
    // Mirrors the DB's unique (name, color, type), but case-insensitively.
    const duplicate = s.products.some(
      (p) =>
        p.id !== rec.id &&
        p.type === rec.type &&
        p.name.toLowerCase() === rec.name.toLowerCase() &&
        p.color.toLowerCase() === rec.color.toLowerCase(),
    );
    if (duplicate) {
      window.alert(`"${rec.name}" in ${rec.color} (${rec.type}) already exists. Edit that one instead.`);
      return;
    }
    await saveProductAction(rec);
    setState((s) => {
      const exists = s.products.some((p) => p.id === rec.id);
      const products = exists ? s.products.map((p) => (p.id === rec.id ? rec : p)) : [...s.products, rec];
      products.sort((a, b) => a.name.localeCompare(b.name) || a.color.localeCompare(b.color) || a.type.localeCompare(b.type));
      return { ...s, products, dialog: null, editId: null };
    });
  }, []);

  const openAddOrder = useCallback(() => {
    router.push("/orders/new");
  }, [router]);
  const openEditOrder = useCallback(
    (id: string) => {
      router.push(`/orders/${id}`);
    },
    [router],
  );
  const deleteOrder = useCallback((id: string) => {
    const o = stateRef.current.orders.find((x) => x.id === id);
    if (!o) return;
    const paymentCount = stateRef.current.transactions.filter((t) => t.orderId === id).length;
    const note = paymentCount > 0 ? ` Its ${paymentCount} payment${paymentCount === 1 ? "" : "s"} stay in Transactions, unlinked.` : "";
    if (!window.confirm(`Delete order ${o.orderNumber}?${note}`)) return;
    // Mirrors the DB's `on delete set null` on transactions.order_id.
    setState((s) => ({
      ...s,
      orders: s.orders.filter((x) => x.id !== id),
      transactions: s.transactions.map((t) => (t.orderId === id ? { ...t, orderId: null } : t)),
    }));
    deleteOrderAction(id).catch((err) => console.error("Failed to delete order", err));
  }, []);
  const saveOrderOptimistic = useCallback((rec: Order) => {
    setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === rec.id ? rec : o)) }));
    saveOrderAction(rec, null).catch((err) => console.error("Failed to save order", err));
  }, []);
  const advanceOrderStatus = useCallback(
    (id: string) => {
      const existing = stateRef.current.orders.find((o) => o.id === id);
      const next = existing && NEXT_ORDER_STATUS[existing.status];
      if (!existing || !next) return;
      saveOrderOptimistic({ ...existing, status: next.status });
    },
    [saveOrderOptimistic],
  );
  const submitOrder = useCallback(async (values: OrderSubmitValues) => {
    const s = stateRef.current;
    const orderId = values.id ?? s.editId ?? uid();
    const existing = s.orders.find((o) => o.id === orderId);
    const deliveryCharge = Math.abs(values.deliveryCharge || 0);
    // A payment is only taken here for a new order; an existing one keeps what it has.
    const payment: OrderPayment | null =
      !existing && values.payment && values.payment.amount > 0 ? { id: uid(), ...values.payment } : null;
    const amountPaid = existing ? existing.amountPaid : (payment?.amount ?? 0);
    const draft: Omit<Order, "orderNumber"> = {
      id: orderId,
      customerId: values.customerId,
      orderDate: values.orderDate,
      status: values.status,
      items: values.items,
      deliveryCharge,
      deliveryLocation: values.deliveryLocation,
      deliveryProviderId: values.deliveryProviderId,
      paymentMethodId: values.paymentMethodId,
      amountPaid,
      ...orderTotals(values.items, deliveryCharge, amountPaid),
    };
    if (draft.totalPrice < amountPaid) {
      window.alert(`The total can't be less than the ${fmtMoney(amountPaid)} already paid. Correct the payments in Transactions first.`);
      return;
    }
    // The DB assigns the number on first save and keeps it on later ones.
    const rec: Order = { ...draft, orderNumber: await saveOrderAction(draft, payment) };
    setState((s) => {
      const orders = existing ? s.orders.map((o) => (o.id === rec.id ? rec : o)) : [...s.orders, rec];
      // Mirrors save_order(): a first payment becomes an income transaction, and
      // existing payments follow the order's customer.
      const transactions = payment
        ? [...s.transactions, orderPaymentTransaction(rec, payment)]
        : s.transactions.map((t) => (t.orderId === rec.id ? { ...t, customerId: rec.customerId } : t));
      return { ...s, orders, transactions, dialog: null, editId: null };
    });
  }, []);

  const openRecordPayment = useCallback(
    (orderId: string) => setState((s) => ({ ...s, dialog: "payment", editId: orderId })),
    [],
  );
  const submitPayment = useCallback(async (values: PaymentSubmitValues) => {
    const s = stateRef.current;
    const order = s.orders.find((o) => o.id === s.editId);
    if (!order) return;
    const payment: OrderPayment = { id: uid(), ...values };
    await recordOrderPaymentAction(order.id, payment);
    setState((s) => {
      const transactions = [...s.transactions, orderPaymentTransaction(order, payment)];
      return { ...s, transactions, orders: syncOrderPayments(s.orders, transactions), dialog: null, editId: null };
    });
  }, []);

  const value: FinanceContextValue = {
    state,
    setDateStart,
    setDateEnd,
    presetMonth,
    presetQuarter,
    presetYTD,
    presetAll,
    setFilterType,
    setFilterCategory,
    closeDialog,
    openAddTxn,
    openEditTxn,
    deleteTxn,
    setTxnFormType,
    submitTxn,
    openAddBudget,
    openEditBudget,
    deleteBudget,
    submitBudget,
    openAddInvoice,
    openEditInvoice,
    deleteInvoice,
    markInvoicePaid,
    submitInvoice,
    openAddCustomer,
    openEditCustomer,
    deleteCustomer,
    submitCustomer,
    openAddCategory,
    openEditCategory,
    deleteCategory,
    submitCategory,
    openAddChannel,
    openEditChannel,
    deleteChannel,
    submitChannel,
    openAddSource,
    openEditSource,
    deleteSource,
    submitSource,
    openAddDeliveryProvider,
    openEditDeliveryProvider,
    deleteDeliveryProvider,
    submitDeliveryProvider,
    openAddPaymentMethod,
    openEditPaymentMethod,
    deletePaymentMethod,
    submitPaymentMethod,
    openAddProduct,
    openEditProduct,
    deleteProduct,
    submitProduct,
    openAddOrder,
    openEditOrder,
    deleteOrder,
    advanceOrderStatus,
    openRecordPayment,
    submitPayment,
    submitOrder,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within a FinanceProvider");
  return ctx;
}

// Mirrors the design source's renderVals(): every page-level derived value,
// recomputed from raw state whenever the date range, filters or records change.
export function useDashboardData() {
  const { state } = useFinance();
  const s = state;

  return useMemo(() => {
    const reportTransactions = adjustOrderPaymentIncome(s.transactions, s.orders, s.deliveryProviders);
    const filtered = s.transactions.filter((t) => inRange(t.date, s.dateStart, s.dateEnd));
    const reportFiltered = reportTransactions.filter((t) => inRange(t.date, s.dateStart, s.dateEnd));
    const totalIncome = reportFiltered.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const netIncome = totalIncome - totalExpense;

    const rangeDays = daysBetween(s.dateStart, s.dateEnd) + 1;
    const prevEnd = addDays(s.dateStart, -1);
    const prevStart = addDays(prevEnd, -(rangeDays - 1));
    const prevTx = reportTransactions.filter((t) => inRange(t.date, prevStart, prevEnd));
    const prevIncome = prevTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const prevExpense = prevTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const prevNet = prevIncome - prevExpense;

    const incD = deltaBits(totalIncome, prevIncome, true);
    const expD = deltaBits(totalExpense, prevExpense, false);
    const netD = deltaBits(netIncome, prevNet, true);

    const categoryById = new Map(s.categories.map((c) => [c.id, c]));
    const channelById = new Map(s.channels.map((c) => [c.id, c]));
    const sourceById = new Map(s.sources.map((x) => [x.id, x]));
    const customerById = new Map(s.customers.map((c) => [c.id, c]));
    const categoryName = (id: string) => categoryById.get(id)?.name ?? "Unknown category";
    const customerName = (id: string) => customerById.get(id)?.name ?? "Unknown customer";

    const monthAgg = buildMonthAgg(reportFiltered, s.dateStart, s.dateEnd);
    const chart = buildChartData(monthAgg);
    const categoryBreakdown = buildCategoryBreakdown(filtered, totalExpense, categoryName);

    const dateDisplayAmount = (t: Transaction) => ({
      dateDisplay: fmtDate(t.date),
      amountDisplay: (t.type === "income" ? "+" : "–") + fmtMoney(t.amount).replace(/^–/, ""),
      amountClass: t.type === "income" ? "text-accent-600" : "text-ink",
    });

    const recentTransactions = filtered
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((t) => ({ id: t.id, description: t.description, ...dateDisplayAmount(t) }));

    const categoryOptions = (type: TxnType) => s.categories.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const transactionsList = filtered
      .filter(
        (t) =>
          (s.filterType === "all" || t.type === s.filterType) &&
          (s.filterCategory === "all" || t.categoryId === s.filterCategory),
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        ...dateDisplayAmount(t),
        category: categoryName(t.categoryId),
        channel: (t.channelId && channelById.get(t.channelId)?.name) || "—",
        customerName: t.customerId ? customerName(t.customerId) : null,
        sourceName: t.sourceId ? (sourceById.get(t.sourceId)?.name ?? "Unknown source") : null,
        tagClass: t.type === "income" ? "bg-accent-50 text-accent-700" : "bg-mist text-graphite",
      }));

    const monthsInRange = monthsBetweenInclusive(s.dateStart, s.dateEnd);
    const budgetRows = s.budgets.map((b) => {
      const scaledTarget = b.target * monthsInRange;
      const actual = filtered.filter((t) => t.categoryId === b.categoryId).reduce((a, t) => a + t.amount, 0);
      const pct = scaledTarget > 0 ? (actual / scaledTarget) * 100 : 0;
      const over = actual > scaledTarget;
      return {
        id: b.id,
        category: categoryName(b.categoryId),
        target: scaledTarget,
        targetDisplay: fmtMoney(scaledTarget),
        actual,
        actualDisplay: fmtMoney(actual),
        pctWidth: Math.min(100, pct) + "%",
        barClass: over ? "fill-accent-800" : "fill-accent-500",
        over,
        overAmountDisplay: fmtMoney(actual - scaledTarget),
      };
    });
    budgetRows.sort((a, b) => a.category.localeCompare(b.category));
    const totalBudgetTarget = s.budgets.reduce((a, b) => a + b.target * monthsInRange, 0);
    const totalBudgetActual = budgetRows.reduce((a, r) => a + r.actual, 0);

    const invFiltered = s.invoices.filter((i) => inRange(i.issueDate, s.dateStart, s.dateEnd));
    const invoicesList = invFiltered
      .slice()
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
      .map((inv) => {
        const overdue = !inv.paid && inv.dueDate < TODAY;
        const status = inv.paid ? "Paid" : overdue ? "Overdue" : "Outstanding";
        return {
          id: inv.id,
          client: inv.customerId ? customerName(inv.customerId) : "—",
          issueDate: inv.issueDate,
          issueDisplay: fmtDate(inv.issueDate),
          dueDate: inv.dueDate,
          dueDisplay: fmtDate(inv.dueDate),
          amount: inv.amount,
          amountDisplay: fmtMoney(inv.amount),
          status,
          statusClass: STATUS_CLASSES[status],
          showMarkPaid: !inv.paid,
        };
      });
    const totalOutstanding = invFiltered.filter((i) => !i.paid).reduce((a, i) => a + i.amount, 0);
    const overdueCount = invFiltered.filter((i) => !i.paid && i.dueDate < TODAY).length;
    const paidTotal = invFiltered.filter((i) => i.paid).reduce((a, i) => a + i.amount, 0);

    const customerRows = s.customers.map((c) => {
      const linked = reportTransactions.filter((t) => t.type === "income" && t.customerId === c.id);
      const inRangeIncome = linked.filter((t) => inRange(t.date, s.dateStart, s.dateEnd)).reduce((a, t) => a + t.amount, 0);
      const lifetimeIncome = linked.reduce((a, t) => a + t.amount, 0);
      const lastDate = linked.reduce((m, t) => (t.date > m ? t.date : m), "");
      return {
        id: c.id,
        name: c.name,
        company: c.company || "—",
        contact: [c.email, c.phone].filter(Boolean).join(" · ") || "—",
        inRangeIncome,
        inRangeDisplay: fmtMoney(inRangeIncome),
        lifetimeIncome,
        lifetimeDisplay: fmtMoney(lifetimeIncome),
        lastDate,
        paymentsLabel: linked.length + " payment" + (linked.length === 1 ? "" : "s"),
        lastDisplay: lastDate ? fmtDate(lastDate) : "—",
      };
    });
    const customerIncomeInRange = customerRows.reduce((a, r) => a + r.inRangeIncome, 0);
    const unlinkedIncome = totalIncome - customerIncomeInRange;
    const topCustomer = customerRows.reduce<(typeof customerRows)[number] | null>(
      (best, r) => (r.inRangeIncome > 0 && (!best || r.inRangeIncome > best.inRangeIncome) ? r : best),
      null,
    );

    const editingTxn = s.editId && s.dialog === "txn" ? s.transactions.find((t) => t.id === s.editId) : null;
    const editingBudget = s.editId && s.dialog === "budget" ? s.budgets.find((b) => b.id === s.editId) : null;
    const editingInvoice = s.editId && s.dialog === "invoice" ? s.invoices.find((i) => i.id === s.editId) : null;
    const categoryRows = (type: TxnType) =>
      s.categories
        .filter((c) => c.type === type)
        .map((c) => {
          const count = s.transactions.filter((t) => t.categoryId === c.id).length;
          const budgeted = s.budgets.some((b) => b.categoryId === c.id);
          return {
            id: c.id,
            name: c.name,
            usageCount: count,
            usageLabel: count + " transaction" + (count === 1 ? "" : "s"),
            budgeted,
          };
        });
    const editingCategory = s.editId && s.dialog === "category" ? s.categories.find((c) => c.id === s.editId) : null;

    const channelOptions = (type: TxnType) => s.channels.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const channelRows = (type: TxnType) =>
      s.channels
        .filter((c) => c.type === type)
        .map((c) => {
          const count = s.transactions.filter((t) => t.channelId === c.id).length;
          return { id: c.id, name: c.name, usageCount: count, usageLabel: count + " transaction" + (count === 1 ? "" : "s") };
        });
    const editingChannel = s.editId && s.dialog === "channel" ? s.channels.find((c) => c.id === s.editId) : null;

    const sourceRows = s.sources.map((x) => {
      const linked = s.transactions.filter((t) => t.type === "expense" && t.sourceId === x.id);
      const inRangeSpend = linked.filter((t) => inRange(t.date, s.dateStart, s.dateEnd)).reduce((a, t) => a + t.amount, 0);
      return {
        id: x.id,
        name: x.name,
        usageCount: linked.length,
        usageLabel: linked.length + " expense" + (linked.length === 1 ? "" : "s"),
        inRangeSpend,
        inRangeDisplay: fmtMoney(inRangeSpend),
      };
    });
    const sourcedExpense = sourceRows.reduce((a, r) => a + r.inRangeSpend, 0);
    const editingSource = s.editId && s.dialog === "source" ? s.sources.find((x) => x.id === s.editId) : null;

    const editingCustomer = s.editId && s.dialog === "customer" ? s.customers.find((c) => c.id === s.editId) : null;

    const productRows = s.products.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      typeLabel: PAPER_TYPE_LABELS[p.type],
      typeClass: p.type === "lined" ? "bg-accent-50 text-accent-700" : "bg-mist text-graphite",
      quantity: p.quantity,
      quantityDisplay: String(p.quantity),
      quantityClass: p.quantity === 0 ? "text-error" : "text-ink",
      price: p.price,
      priceDisplay: fmtMoney(p.price),
      stockValue: p.quantity * p.price,
      stockValueDisplay: fmtMoney(p.quantity * p.price),
    }));
    const totalUnits = s.products.reduce((a, p) => a + p.quantity, 0);
    const stockValue = s.products.reduce((a, p) => a + p.quantity * p.price, 0);
    const outOfStockCount = s.products.filter((p) => p.quantity === 0).length;
    const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
    const editingProduct = s.editId && s.dialog === "product" ? s.products.find((p) => p.id === s.editId) : null;

    const deliveryProviderById = new Map(s.deliveryProviders.map((x) => [x.id, x]));
    const paymentMethodById = new Map(s.paymentMethods.map((x) => [x.id, x]));
    const ordersInRange = s.orders.filter((o) => inRange(o.orderDate, s.dateStart, s.dateEnd));
    const orderCountLabel = (n: number) => n + " order" + (n === 1 ? "" : "s");

    const deliveryProviderRows = s.deliveryProviders.map((x) => {
      const linked = s.orders.filter((o) => o.deliveryProviderId === x.id);
      const inRangeCharges = linked.filter((o) => inRange(o.orderDate, s.dateStart, s.dateEnd)).reduce((a, o) => a + o.deliveryCharge, 0);
      return { id: x.id, name: x.name, usageCount: linked.length, usageLabel: orderCountLabel(linked.length), inRangeCharges, inRangeDisplay: fmtMoney(inRangeCharges) };
    });
    const providerDeliveryCharges = deliveryProviderRows.reduce((a, r) => a + r.inRangeCharges, 0);
    const ordersWithoutProvider = ordersInRange.filter((o) => !o.deliveryProviderId).length;
    const editingDeliveryProvider =
      s.editId && s.dialog === "deliveryProvider" ? s.deliveryProviders.find((x) => x.id === s.editId) : null;

    const paymentMethodRows = s.paymentMethods.map((x) => {
      const linked = s.orders.filter((o) => o.paymentMethodId === x.id);
      const inRangeValue = linked.filter((o) => inRange(o.orderDate, s.dateStart, s.dateEnd)).reduce((a, o) => a + o.totalPrice, 0);
      return { id: x.id, name: x.name, usageCount: linked.length, usageLabel: orderCountLabel(linked.length), inRangeValue, inRangeDisplay: fmtMoney(inRangeValue) };
    });
    const methodOrderValue = paymentMethodRows.reduce((a, r) => a + r.inRangeValue, 0);
    const ordersWithoutMethod = ordersInRange.filter((o) => !o.paymentMethodId).length;
    const editingPaymentMethod = s.editId && s.dialog === "paymentMethod" ? s.paymentMethods.find((x) => x.id === s.editId) : null;

    const productById = new Map(s.products.map((p) => [p.id, p]));
    const productLabel = (p: Product) => `${p.name} · ${p.color}, ${PAPER_TYPE_LABELS[p.type]}`;
    const orderRows = ordersInRange
      .slice()
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.orderNumber.localeCompare(a.orderNumber))
      .map((o) => {
        const units = o.items.reduce((a, i) => a + i.quantity, 0);
        const next = NEXT_ORDER_STATUS[o.status];
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          orderDate: o.orderDate,
          dateDisplay: fmtDate(o.orderDate),
          customer: customerName(o.customerId),
          deliveryLocation: o.deliveryLocation,
          deliveryProvider: o.deliveryProviderId ? (deliveryProviderById.get(o.deliveryProviderId)?.name ?? "Unknown provider") : null,
          paymentMethod: o.paymentMethodId ? (paymentMethodById.get(o.paymentMethodId)?.name ?? "Unknown method") : null,
          itemsSummary: o.items
            .map((i) => {
              const p = productById.get(i.productId);
              return `${i.quantity} × ${p ? productLabel(p) : "Unknown product"}`;
            })
            .join(", "),
          unitsLabel: units + " unit" + (units === 1 ? "" : "s"),
          totalPrice: o.totalPrice,
          totalDisplay: fmtMoney(o.totalPrice),
          deliveryCharge: o.deliveryCharge,
          deliveryDisplay: o.deliveryCharge > 0 ? "incl. " + fmtMoney(o.deliveryCharge) + " delivery" : null,
          amountPaid: o.amountPaid,
          paidDisplay: fmtMoney(o.amountPaid),
          dueAmount: o.totalPrice - o.amountPaid,
          dueDisplay: o.paymentStatus === "paid" ? null : fmtMoney(o.totalPrice - o.amountPaid) + " due",
          status: ORDER_STATUS_LABELS[o.status],
          statusClass: ORDER_STATUS_CLASSES[o.status],
          paymentStatus: PAYMENT_STATUS_LABELS[o.paymentStatus],
          paymentStatusClass: PAYMENT_STATUS_CLASSES[o.paymentStatus],
          nextStepLabel: next?.label ?? null,
          showRecordPayment: o.paymentStatus !== "paid",
        };
      });
    const orderRevenue = ordersInRange.reduce((a, o) => a + o.totalPrice, 0);
    const orderBalanceDue = ordersInRange.reduce((a, o) => a + (o.totalPrice - o.amountPaid), 0);
    const openOrderCount = ordersInRange.filter((o) => o.status !== "delivered").length;
    const editingOrder = s.editId && s.dialog === "order" ? s.orders.find((o) => o.id === s.editId) : null;

    // New payments default to the order's last payment's category and channel,
    // else to the "Order Sales" category (added by the orders migration).
    const incomeCategories = s.categories.filter((c) => c.type === "income");
    const defaultPaymentCategoryId = (incomeCategories.find((c) => c.name === "Order Sales") ?? incomeCategories[0])?.id ?? "";
    const payingOrder = s.editId && s.dialog === "payment" ? s.orders.find((o) => o.id === s.editId) : null;
    const lastPayment = payingOrder
      ? s.transactions.filter((t) => t.orderId === payingOrder.id).reduce<Transaction | null>((m, t) => (!m || t.date >= m.date ? t : m), null)
      : null;
    const paymentDialog = payingOrder
      ? {
        orderNumber: payingOrder.orderNumber,
        totalDisplay: fmtMoney(payingOrder.totalPrice),
        paidDisplay: fmtMoney(payingOrder.amountPaid),
        balance: roundMoney(payingOrder.totalPrice - payingOrder.amountPaid),
        categoryId: lastPayment?.categoryId ?? defaultPaymentCategoryId,
        channelId: lastPayment?.channelId ?? "",
      }
      : null;

    return {
      incomeDisplay: fmtMoney(totalIncome),
      expenseDisplay: fmtMoney(totalExpense),
      netDisplay: fmtMoney(netIncome),
      incomeDelta: incD,
      expenseDelta: expD,
      netDelta: netD,

      isBarChart: false,
      isLineChart: true,
      chart,

      categoryBreakdown,
      categoryBreakdownEmpty: categoryBreakdown.length === 0,
      recentTransactions,

      incomeCategoryOptions: categoryOptions("income"),
      expenseCategoryOptions: categoryOptions("expense"),
      transactionsList,
      transactionsEmpty: transactionsList.length === 0,
      transactionsCountLabel: transactionsList.length + " transaction" + (transactionsList.length === 1 ? "" : "s"),

      budgetRows,
      totalBudgetDisplay: fmtMoney(totalBudgetTarget),
      totalActualDisplay: fmtMoney(totalBudgetActual),
      totalRemainingDisplay: fmtMoney(totalBudgetTarget - totalBudgetActual),
      monthsInRangeLabel: monthsInRange + " month" + (monthsInRange === 1 ? "" : "s"),

      invoicesList,
      outstandingDisplay: fmtMoney(totalOutstanding),
      overdueCountDisplay: String(overdueCount),
      paidDisplay: fmtMoney(paidTotal),

      customerRows,
      customersEmpty: customerRows.length === 0,
      customerCountDisplay: String(customerRows.length),
      customerIncomeDisplay: fmtMoney(customerIncomeInRange),
      unlinkedIncomeDisplay: fmtMoney(unlinkedIncome),
      topCustomerDisplay: topCustomer ? topCustomer.name : "—",
      customerOptions: s.customers.map((c) => ({ id: c.id, name: c.name })),

      editingTxn,
      editingBudget,
      editingInvoice,
      editingCustomer,
      editingCategory,
      incomeCategoryRows: categoryRows("income"),
      expenseCategoryRows: categoryRows("expense"),
      txnCategoryOptions: categoryOptions(s.txnFormType),
      editingChannel,
      incomeChannelRows: channelRows("income"),
      expenseChannelRows: channelRows("expense"),
      txnChannelOptions: channelOptions(s.txnFormType),
      editingSource,
      sourceRows,
      sourcesEmpty: sourceRows.length === 0,
      sourceCountDisplay: String(sourceRows.length),
      sourcedExpenseDisplay: fmtMoney(sourcedExpense),
      unsourcedExpenseDisplay: fmtMoney(totalExpense - sourcedExpense),
      sourceOptions: s.sources.map((x) => ({ id: x.id, name: x.name })),

      editingDeliveryProvider,
      deliveryProviderRows,
      deliveryProvidersEmpty: deliveryProviderRows.length === 0,
      deliveryProviderCountDisplay: String(deliveryProviderRows.length),
      providerDeliveryChargesDisplay: fmtMoney(providerDeliveryCharges),
      ordersWithoutProviderDisplay: String(ordersWithoutProvider),
      deliveryProviderOptions: s.deliveryProviders.map((x) => ({ id: x.id, name: x.name })),

      editingPaymentMethod,
      paymentMethodRows,
      paymentMethodsEmpty: paymentMethodRows.length === 0,
      paymentMethodCountDisplay: String(paymentMethodRows.length),
      methodOrderValueDisplay: fmtMoney(methodOrderValue),
      ordersWithoutMethodDisplay: String(ordersWithoutMethod),
      paymentMethodOptions: s.paymentMethods.map((x) => ({ id: x.id, name: x.name })),

      productRows,
      productsEmpty: productRows.length === 0,
      productCountDisplay: String(productRows.length),
      unitsInStockDisplay: String(totalUnits),
      stockValueDisplay: fmtMoney(stockValue),
      outOfStockDisplay: String(outOfStockCount),
      productNameOptions: uniqueSorted(s.products.map((p) => p.name)),
      productColorOptions: uniqueSorted(s.products.map((p) => p.color)),
      editingProduct,

      orderRows,
      ordersEmpty: orderRows.length === 0,
      orderCountDisplay: String(orderRows.length),
      orderRevenueDisplay: fmtMoney(orderRevenue),
      orderBalanceDueDisplay: fmtMoney(orderBalanceDue),
      openOrderCountDisplay: String(openOrderCount),
      orderProductOptions: s.products.map((p) => ({ id: p.id, label: productLabel(p), price: p.price })),
      editingOrder,
      defaultPaymentCategoryId,
      incomeChannelOptions: channelOptions("income"),
      paymentDialog,
    };
  }, [s]);
}
