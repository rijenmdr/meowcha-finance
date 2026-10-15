"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { dateFilterSearch, fmtMoney, parseDateFilter, pickDateFilterSearch, todayISO, variantLabel } from "./format";
import { orderTotals, roundMoney } from "./calculations";
import { INVOICE_STATUS_CLASSES, NEXT_ORDER_STATUS, orderStatusCells } from "./status";
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
  setOrderStatusAction,
} from "./actions";
import type {
  DateFilter,
  DatePreset,
  Budget,
  Category,
  Channel,
  Customer,
  DeliveryProvider,
  DialogKind,
  Invoice,
  Lookups,
  Order,
  OrderItem,
  OrderPayment,
  OrderStatus,
  PaymentMethod,
  PaymentTarget,
  Product,
  ProductVariant,
  Source,
  Transaction,
  TxnType,
} from "./types";

// Only UI state lives here. Records and every total are loaded per page on the
// server (lib/page-data.ts); the layout passes the small lookup tables in.
// The records being edited come from the row that opened the dialog.
interface FinanceState {
  dialog: DialogKind;
  editId: string | null;
  txnFormType: TxnType;
  editingTxn: Transaction | null;
  editingInvoice: Invoice | null;
  paymentTarget: PaymentTarget | null;
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
  id?: string;
  name: string;
  optionNames: string[];
  variants: ProductVariant[];
}

interface CustomerSubmitValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

interface OrderSubmitValues {
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

// What a delete needs from a table row: the name for the prompt, and the usage
// counts the server computed, so a delete the DB would reject is explained first.
interface NamedRow {
  id: string;
  name: string;
}

interface UsedRow extends NamedRow {
  usageCount: number;
}

// Rows hidden or patched while a delete or quick edit is in flight. They fall
// back to the server's rows once the action and the refresh it triggers land,
// or straight away if the action fails.
interface OptimisticRows {
  hidden: ReadonlySet<string>;
  patches: ReadonlyMap<string, object>;
}

type OptimisticOp = { kind: "hide"; id: string } | { kind: "patch"; id: string; patch: object };

const NO_OPTIMISTIC_ROWS: OptimisticRows = { hidden: new Set(), patches: new Map() };

function applyOptimisticOp(cur: OptimisticRows, op: OptimisticOp): OptimisticRows {
  if (op.kind === "hide") return { ...cur, hidden: new Set(cur.hidden).add(op.id) };
  return { ...cur, patches: new Map(cur.patches).set(op.id, { ...cur.patches.get(op.id), ...op.patch }) };
}

interface FinanceContextValue {
  state: FinanceState;
  lookups: Lookups;
  dateFilter: DateFilter;
  isNavigating: boolean;
  optimisticRows: OptimisticRows;
  // Sets (or with null, removes) URL params, which re-renders the page on the server.
  setSearch: (patch: Record<string, string | null>, onStart?: () => void) => void;
  setDateStart: (v: string) => void;
  setDateEnd: (v: string) => void;
  setDatePreset: (v: DatePreset) => void;

  closeDialog: () => void;
  openAddTxn: () => void;
  openEditTxn: (txn: Transaction) => void;
  deleteTxn: (row: { id: string; orderNumber: string | null }) => void;
  setTxnFormType: (t: TxnType) => void;
  submitTxn: (values: TxnSubmitValues) => Promise<void>;

  openAddBudget: () => void;
  openEditBudget: (id: string) => void;
  deleteBudget: (id: string) => void;
  submitBudget: (values: BudgetSubmitValues) => Promise<void>;

  openAddInvoice: () => void;
  openEditInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  markInvoicePaid: (invoice: Invoice) => void;
  submitInvoice: (values: InvoiceSubmitValues) => Promise<void>;

  openAddCustomer: () => void;
  openEditCustomer: (id: string) => void;
  deleteCustomer: (row: NamedRow & { orderCount: number }) => void;
  submitCustomer: (values: CustomerSubmitValues) => Promise<void>;

  openAddCategory: (type?: TxnType) => void;
  openEditCategory: (id: string) => void;
  deleteCategory: (row: UsedRow & { budgeted: boolean }) => void;
  submitCategory: (values: CategorySubmitValues) => Promise<void>;

  openAddChannel: (type?: TxnType) => void;
  openEditChannel: (id: string) => void;
  deleteChannel: (row: UsedRow) => void;
  submitChannel: (values: ChannelSubmitValues) => Promise<void>;

  openAddSource: () => void;
  openEditSource: (id: string) => void;
  deleteSource: (row: UsedRow) => void;
  submitSource: (values: SourceSubmitValues) => Promise<void>;

  openAddDeliveryProvider: () => void;
  openEditDeliveryProvider: (id: string) => void;
  deleteDeliveryProvider: (row: UsedRow) => void;
  submitDeliveryProvider: (values: DeliveryProviderSubmitValues) => Promise<void>;

  openAddPaymentMethod: () => void;
  openEditPaymentMethod: (id: string) => void;
  deletePaymentMethod: (row: UsedRow) => void;
  submitPaymentMethod: (values: PaymentMethodSubmitValues) => Promise<void>;

  openAddProduct: () => void;
  openEditProduct: (id: string) => void;
  deleteProduct: (row: NamedRow & { variantCount: number; orderCount: number }) => void;
  submitProduct: (values: ProductSubmitValues, variantIdsInUse: string[]) => Promise<string | null>;

  openAddOrder: () => void;
  openEditOrder: (id: string) => void;
  deleteOrder: (row: { id: string; orderNumber: string; paymentCount: number }) => void;
  advanceOrderStatus: (row: { id: string; orderStatus: OrderStatus }) => void;
  openRecordPayment: (target: PaymentTarget) => void;
  submitPayment: (values: PaymentSubmitValues) => Promise<void>;
  submitOrder: (values: OrderSubmitValues, existing: Order | null) => Promise<string | null>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const CLOSED_DIALOG = { dialog: null, editId: null, editingTxn: null, editingInvoice: null, paymentTarget: null } as const;

export function FinanceProvider({ children, lookups }: { children: ReactNode; lookups: Lookups }) {
  const router = useRouter();

  // Random rather than a per-session counter: a counter restarts on every page
  // load, so a new record could reuse (and upsert over) an id saved earlier.
  const uid = () => crypto.randomUUID();

  const { confirm, notify, dialog: confirmDialog } = useConfirmDialog();

  const [state, setState] = useState<FinanceState>({ ...CLOSED_DIALOG, txnFormType: "expense" });

  // Mutation callbacks below are memoized, so they can't read `state` or
  // `lookups` from their closure (it would be frozen at mount). These refs
  // mirror the latest values on every render instead.
  const stateRef = useRef(state);
  const lookupsRef = useRef(lookups);
  useEffect(() => {
    stateRef.current = state;
    lookupsRef.current = lookups;
  }, [state, lookups]);

  // Every URL change is a navigation the server renders, so it runs in a
  // transition: the current page stays up (dimmed) until the new one arrives.
  const [isNavigating, startNavigation] = useTransition();
  const navigate = useCallback(
    (search: string, onStart?: () => void) => {
      startNavigation(() => {
        onStart?.();
        router.replace(window.location.pathname + search, { scroll: false });
      });
    },
    [router],
  );
  const setSearch = useCallback(
    (patch: Record<string, string | null>, onStart?: () => void) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      navigate(query ? "?" + query : "", onStart);
    },
    [navigate],
  );

  // The filter shows the new value straight away, while the page loads.
  const searchParams = useSearchParams();
  const urlDateFilter = useMemo(() => parseDateFilter(searchParams, todayISO()), [searchParams]);
  const [dateFilter, setOptimisticDateFilter] = useOptimistic(urlDateFilter);
  const dateFilterRef = useRef(dateFilter);
  useEffect(() => {
    dateFilterRef.current = dateFilter;
  }, [dateFilter]);
  const writeDateFilter = useCallback(
    (f: DateFilter) => {
      dateFilterRef.current = f;
      navigate(dateFilterSearch(new URLSearchParams(window.location.search), f), () => setOptimisticDateFilter(f));
    },
    [navigate, setOptimisticDateFilter],
  );
  const setDateStart = useCallback((v: string) => writeDateFilter({ ...dateFilterRef.current, preset: "custom", start: v }), [writeDateFilter]);
  const setDateEnd = useCallback((v: string) => writeDateFilter({ ...dateFilterRef.current, preset: "custom", end: v }), [writeDateFilter]);
  // Custom keeps the current range, so the date inputs start from what was shown.
  const setDatePreset = useCallback(
    (v: DatePreset) =>
      writeDateFilter(
        v === "custom" ? { ...dateFilterRef.current, preset: v } : parseDateFilter(new URLSearchParams({ period: v }), todayISO()),
      ),
    [writeDateFilter],
  );

  const [optimisticRows, applyOptimistic] = useOptimistic(NO_OPTIMISTIC_ROWS, applyOptimisticOp);
  // Shows a delete or quick edit at once, then runs the action. Its refresh
  // brings the real rows; a failure only logs, and the row reappears unchanged.
  const runOptimistic = useCallback(
    (op: OptimisticOp, action: () => Promise<void>, failure: string) => {
      startTransition(async () => {
        applyOptimistic(op);
        try {
          await action();
        } catch (err) {
          console.error(failure, err);
        }
      });
    },
    [applyOptimistic],
  );

  const closeDialog = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG })), []);

  const openAddTxn = useCallback(
    () => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "txn", txnFormType: "expense" })),
    [],
  );
  const openEditTxn = useCallback(
    (txn: Transaction) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "txn", editId: txn.id, editingTxn: txn, txnFormType: txn.type })),
    [],
  );
  const deleteTxn = useCallback(
    async (row: { id: string; orderNumber: string | null }) => {
      const note = row.orderNumber ? `It's a payment for ${row.orderNumber}, so that order's amount paid will drop.` : undefined;
      if (!(await confirm({ title: "Delete this transaction?", description: note, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteTransactionAction(row.id), "Failed to delete transaction");
    },
    [confirm, runOptimistic],
  );
  const setTxnFormType = useCallback((t: TxnType) => setState((s) => ({ ...s, txnFormType: t })), []);
  const submitTxn = useCallback(async (values: TxnSubmitValues) => {
    const s = stateRef.current;
    const existing = s.editingTxn;
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
    setState((s) => ({ ...s, ...CLOSED_DIALOG }));
  }, []);

  const openAddBudget = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "budget" })), []);
  const openEditBudget = useCallback((id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "budget", editId: id })), []);
  const deleteBudget = useCallback(
    async (id: string) => {
      if (!(await confirm({ title: "Remove this budget category?", confirmLabel: "Remove", destructive: true }))) return;
      runOptimistic({ kind: "hide", id }, () => deleteBudgetAction(id), "Failed to delete budget");
    },
    [confirm, runOptimistic],
  );
  const submitBudget = useCallback(async (values: BudgetSubmitValues) => {
    const s = stateRef.current;
    const { budgets } = lookupsRef.current;
    const target = Math.abs(values.target || 0);
    let rec: Budget;
    if (s.editId) {
      rec = { id: s.editId, categoryId: budgets.find((b) => b.id === s.editId)?.categoryId ?? values.categoryId, target };
    } else {
      const existing = budgets.find((b) => b.categoryId === values.categoryId);
      rec = existing ? { ...existing, target } : { id: uid(), categoryId: values.categoryId, target };
    }
    await saveBudgetAction(rec);
    setState((s) => ({ ...s, ...CLOSED_DIALOG }));
  }, []);

  const openAddInvoice = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "invoice" })), []);
  const openEditInvoice = useCallback(
    (invoice: Invoice) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "invoice", editId: invoice.id, editingInvoice: invoice })),
    [],
  );
  const deleteInvoice = useCallback(
    async (id: string) => {
      if (!(await confirm({ title: "Delete this invoice?", confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id }, () => deleteInvoiceAction(id), "Failed to delete invoice");
    },
    [confirm, runOptimistic],
  );
  const markInvoicePaid = useCallback(
    (invoice: Invoice) => {
      const rec: Invoice = { ...invoice, paid: true };
      runOptimistic(
        { kind: "patch", id: invoice.id, patch: { status: "Paid", statusClass: INVOICE_STATUS_CLASSES.Paid, showMarkPaid: false, invoice: rec } },
        () => saveInvoiceAction(rec),
        "Failed to save invoice",
      );
    },
    [runOptimistic],
  );
  const submitInvoice = useCallback(async (values: InvoiceSubmitValues) => {
    const s = stateRef.current;
    const rec: Invoice = {
      id: s.editingInvoice?.id ?? uid(),
      customerId: values.customerId,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      amount: Math.abs(values.amount || 0),
      paid: values.paid,
    };
    await saveInvoiceAction(rec);
    setState((s) => ({ ...s, ...CLOSED_DIALOG }));
  }, []);

  const openAddCustomer = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "customer" })), []);
  const openEditCustomer = useCallback((id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "customer", editId: id })), []);
  const deleteCustomer = useCallback(
    async (row: NamedRow & { orderCount: number }) => {
      // Every order needs a customer, so orders.customer_id has no on-delete action.
      if (row.orderCount > 0) {
        await notify({
          title: "Can't delete this customer",
          description: `"${row.name}" has ${row.orderCount} order${row.orderCount === 1 ? "" : "s"}. Delete those first.`,
        });
        return;
      }
      if (
        !(await confirm({
          title: "Delete this customer?",
          description: "Linked income and invoices stay, but are unlinked.",
          confirmLabel: "Delete",
          destructive: true,
        }))
      )
        return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteCustomerAction(row.id), "Failed to delete customer");
    },
    [confirm, notify, runOptimistic],
  );
  const submitCustomer = useCallback(async (values: CustomerSubmitValues) => {
    const rec: Customer = { id: stateRef.current.editId || uid(), ...values };
    await saveCustomerAction(rec);
    setState((s) => ({ ...s, ...CLOSED_DIALOG }));
  }, []);

  // The category dialog reuses txnFormType as its default type selection.
  const openAddCategory = useCallback(
    (type: TxnType = "expense") => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "category", txnFormType: type })),
    [],
  );
  const openEditCategory = useCallback((id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "category", editId: id })), []);
  const deleteCategory = useCallback(
    async (row: UsedRow & { budgeted: boolean }) => {
      if (row.usageCount > 0 || row.budgeted) {
        const uses = [row.usageCount > 0 && `${row.usageCount} transaction${row.usageCount === 1 ? "" : "s"}`, row.budgeted && "a budget"].filter(Boolean);
        await notify({
          title: "Can't delete this category",
          description: `"${row.name}" is used by ${uses.join(" and ")}. Reassign or remove those first, or rename the category instead.`,
        });
        return;
      }
      if (!(await confirm({ title: `Delete the "${row.name}" category?`, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteCategoryAction(row.id), "Failed to delete category");
    },
    [confirm, notify, runOptimistic],
  );
  const submitCategory = useCallback(
    async (values: CategorySubmitValues) => {
      const s = stateRef.current;
      const { categories } = lookupsRef.current;
      const existing = s.editId ? categories.find((c) => c.id === s.editId) : undefined;
      const rec: Category = { id: existing?.id ?? uid(), name: values.name, type: existing?.type ?? values.type };
      const duplicate = categories.some((c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase());
      if (duplicate) {
        void notify({ title: "Duplicate category", description: `There's already a ${rec.type} category called "${rec.name}".` });
        return;
      }
      await saveCategoryAction(rec);
      setState((s) => ({ ...s, ...CLOSED_DIALOG }));
    },
    [notify],
  );

  // Like categories, the channel dialog reuses txnFormType as its default type.
  const openAddChannel = useCallback(
    (type: TxnType = "income") => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "channel", txnFormType: type })),
    [],
  );
  const openEditChannel = useCallback((id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "channel", editId: id })), []);
  const deleteChannel = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} transaction${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" channel?`, description: usage, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteChannelAction(row.id), "Failed to delete channel");
    },
    [confirm, runOptimistic],
  );
  const submitChannel = useCallback(
    async (values: ChannelSubmitValues) => {
      const s = stateRef.current;
      const { channels } = lookupsRef.current;
      const existing = s.editId ? channels.find((c) => c.id === s.editId) : undefined;
      const rec: Channel = { id: existing?.id ?? uid(), name: values.name, type: existing?.type ?? values.type };
      const duplicate = channels.some((c) => c.id !== rec.id && c.type === rec.type && c.name.toLowerCase() === rec.name.toLowerCase());
      if (duplicate) {
        void notify({ title: "Duplicate channel", description: `There's already a ${rec.type} channel called "${rec.name}".` });
        return;
      }
      await saveChannelAction(rec);
      setState((s) => ({ ...s, ...CLOSED_DIALOG }));
    },
    [notify],
  );

  const openAddSource = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "source" })), []);
  const openEditSource = useCallback((id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "source", editId: id })), []);
  const deleteSource = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} expense${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" source?`, description: usage, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteSourceAction(row.id), "Failed to delete source");
    },
    [confirm, runOptimistic],
  );
  const submitSource = useCallback(
    async (values: SourceSubmitValues) => {
      const rec: Source = { id: stateRef.current.editId || uid(), name: values.name };
      // Mirrors the DB's unique (name), but case-insensitively.
      const duplicate = lookupsRef.current.sources.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
      if (duplicate) {
        void notify({ title: "Duplicate source", description: `There's already a source called "${rec.name}".` });
        return;
      }
      await saveSourceAction(rec);
      setState((s) => ({ ...s, ...CLOSED_DIALOG }));
    },
    [notify],
  );

  const openAddDeliveryProvider = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "deliveryProvider" })), []);
  const openEditDeliveryProvider = useCallback(
    (id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "deliveryProvider", editId: id })),
    [],
  );
  const deleteDeliveryProvider = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} order${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" delivery provider?`, description: usage, confirmLabel: "Delete", destructive: true })))
        return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteDeliveryProviderAction(row.id), "Failed to delete delivery provider");
    },
    [confirm, runOptimistic],
  );
  const submitDeliveryProvider = useCallback(
    async (values: DeliveryProviderSubmitValues) => {
      const rec: DeliveryProvider = { id: stateRef.current.editId || uid(), name: values.name };
      // Mirrors the DB's unique (name), but case-insensitively.
      const duplicate = lookupsRef.current.deliveryProviders.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
      if (duplicate) {
        void notify({ title: "Duplicate delivery provider", description: `There's already a delivery provider called "${rec.name}".` });
        return;
      }
      await saveDeliveryProviderAction(rec);
      setState((s) => ({ ...s, ...CLOSED_DIALOG }));
    },
    [notify],
  );

  const openAddPaymentMethod = useCallback(() => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "paymentMethod" })), []);
  const openEditPaymentMethod = useCallback(
    (id: string) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "paymentMethod", editId: id })),
    [],
  );
  const deletePaymentMethod = useCallback(
    async (row: UsedRow) => {
      const usage = row.usageCount > 0 ? `${row.usageCount} order${row.usageCount === 1 ? "" : "s"} will be unlinked.` : undefined;
      if (!(await confirm({ title: `Delete the "${row.name}" payment method?`, description: usage, confirmLabel: "Delete", destructive: true })))
        return;
      runOptimistic({ kind: "hide", id: row.id }, () => deletePaymentMethodAction(row.id), "Failed to delete payment method");
    },
    [confirm, runOptimistic],
  );
  const submitPaymentMethod = useCallback(
    async (values: PaymentMethodSubmitValues) => {
      const rec: PaymentMethod = { id: stateRef.current.editId || uid(), name: values.name };
      const duplicate = lookupsRef.current.paymentMethods.some((x) => x.id !== rec.id && x.name.toLowerCase() === rec.name.toLowerCase());
      if (duplicate) {
        void notify({ title: "Duplicate payment method", description: `There's already a payment method called "${rec.name}".` });
        return;
      }
      await savePaymentMethodAction(rec);
      setState((s) => ({ ...s, ...CLOSED_DIALOG }));
    },
    [notify],
  );

  const openAddProduct = useCallback(() => {
    router.push(withDateFilter("/products/new"));
  }, [router]);
  const openEditProduct = useCallback(
    (id: string) => {
      router.push(withDateFilter(`/products/${id}`));
    },
    [router],
  );
  const deleteProduct = useCallback(
    async (row: NamedRow & { variantCount: number; orderCount: number }) => {
      // order_items.variant_id has no on-delete action, so the DB would reject this.
      if (row.orderCount > 0) {
        await notify({
          title: "Can't delete this product",
          description: `"${row.name}" is on ${row.orderCount} order${row.orderCount === 1 ? "" : "s"}. Remove it from those first.`,
        });
        return;
      }
      if (
        !(await confirm({
          title: `Delete "${row.name}"?`,
          description: `Its ${row.variantCount} variant${row.variantCount === 1 ? "" : "s"} will be deleted too.`,
          confirmLabel: "Delete",
          destructive: true,
        }))
      )
        return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteProductAction(row.id), "Failed to delete product");
    },
    [confirm, notify, runOptimistic],
  );
  // Resolves to a message when the product can't be saved; throws if the server save fails.
  const submitProduct = useCallback(async (values: ProductSubmitValues, variantIdsInUse: string[]): Promise<string | null> => {
    const { products } = lookupsRef.current;
    const rec: Product = {
      id: values.id || uid(),
      name: values.name,
      optionNames: values.optionNames,
      variants: values.variants.map((v) => ({
        id: v.id,
        options: v.options,
        quantity: Math.max(0, Math.trunc(v.quantity || 0)),
        price: Math.abs(v.price || 0),
      })),
    };
    // Mirrors the DB's unique product name, case-insensitively.
    if (products.some((p) => p.id !== rec.id && p.name.trim().toLowerCase() === rec.name.toLowerCase())) {
      return `"${rec.name}" already exists. Add a variant to that product instead.`;
    }
    // A removed variant that is on an order would be rejected by the DB.
    const kept = new Set(rec.variants.map((v) => v.id));
    const removedInUse = variantIdsInUse.filter((id) => !kept.has(id)).length;
    if (removedInUse > 0) {
      return `${removedInUse === 1 ? "A removed variant is" : "Removed variants are"} on an order. Remove ${removedInUse === 1 ? "it" : "them"} from those orders first.`;
    }
    await saveProductAction(rec);
    return null;
  }, []);

  const openAddOrder = useCallback(() => {
    router.push(withDateFilter("/orders/new"));
  }, [router]);
  const openEditOrder = useCallback(
    (id: string) => {
      router.push(withDateFilter(`/orders/${id}`));
    },
    [router],
  );
  const deleteOrder = useCallback(
    async (row: { id: string; orderNumber: string; paymentCount: number }) => {
      const note =
        row.paymentCount > 0 ? `Its ${row.paymentCount} payment${row.paymentCount === 1 ? "" : "s"} stay in Transactions, unlinked.` : undefined;
      if (!(await confirm({ title: `Delete order ${row.orderNumber}?`, description: note, confirmLabel: "Delete", destructive: true }))) return;
      runOptimistic({ kind: "hide", id: row.id }, () => deleteOrderAction(row.id), "Failed to delete order");
    },
    [confirm, runOptimistic],
  );
  const advanceOrderStatus = useCallback(
    (row: { id: string; orderStatus: OrderStatus }) => {
      const next = NEXT_ORDER_STATUS[row.orderStatus];
      if (!next) return;
      runOptimistic(
        { kind: "patch", id: row.id, patch: orderStatusCells(next.status) },
        () => setOrderStatusAction(row.id, next.status),
        "Failed to update order status",
      );
    },
    [runOptimistic],
  );
  // Resolves to a message when the order can't be saved; throws if the server save fails.
  const submitOrder = useCallback(async (values: OrderSubmitValues, existing: Order | null): Promise<string | null> => {
    const deliveryCharge = Math.abs(values.deliveryCharge || 0);
    // A payment is only taken here for a new order; an existing one keeps what it has.
    const payment: OrderPayment | null = !existing && values.payment && values.payment.amount > 0 ? { id: uid(), ...values.payment } : null;
    const amountPaid = existing ? existing.amountPaid : (payment?.amount ?? 0);
    const draft: Omit<Order, "orderNumber" | "stockTracked"> = {
      id: existing?.id ?? uid(),
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
      return `The total can't be less than the ${fmtMoney(amountPaid)} already paid. Correct the payments in Transactions first.`;
    }
    if (existing ? existing.stockTracked : true) {
      // Stock this order can still draw on: what's on the shelf plus what this order already holds.
      const held = new Map<string, number>();
      if (existing?.stockTracked) for (const i of existing.items) held.set(i.variantId, (held.get(i.variantId) ?? 0) + i.quantity);
      const variants = lookupsRef.current.products.flatMap((p) => p.variants.map((v) => ({ p, v })));
      for (const item of values.items) {
        const found = variants.find(({ v }) => v.id === item.variantId);
        const available = found ? found.v.quantity + (held.get(item.variantId) ?? 0) : Infinity;
        if (found && item.quantity > available) {
          const label = variantLabel(found.p.optionNames, found.v.options);
          return `Not enough stock for ${found.p.name}${label ? ` · ${label}` : ""}: ${available} available.`;
        }
      }
    }
    await saveOrderAction(draft, payment);
    return null;
  }, []);

  const openRecordPayment = useCallback(
    (target: PaymentTarget) => setState((s) => ({ ...s, ...CLOSED_DIALOG, dialog: "payment", editId: target.orderId, paymentTarget: target })),
    [],
  );
  const submitPayment = useCallback(async (values: PaymentSubmitValues) => {
    const target = stateRef.current.paymentTarget;
    if (!target) return;
    await recordOrderPaymentAction(target.orderId, { id: uid(), ...values });
    setState((s) => ({ ...s, ...CLOSED_DIALOG }));
  }, []);

  const value: FinanceContextValue = {
    state,
    lookups,
    dateFilter,
    isNavigating,
    optimisticRows,
    setSearch,
    setDateStart,
    setDateEnd,
    setDatePreset,
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

  return (
    <FinanceContext.Provider value={value}>
      {children}
      {confirmDialog}
    </FinanceContext.Provider>
  );
}

// Keeps the date filter when moving to another dashboard page. Call it from
// event handlers only, since it reads window.location.
export function withDateFilter(path: string): string {
  return path + pickDateFilterSearch(new URLSearchParams(window.location.search));
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within a FinanceProvider");
  return ctx;
}

// A table's rows from the server with any in-flight delete or quick edit applied.
export function useOptimisticRows<T extends { id: string }>(rows: T[]): T[] {
  const { optimisticRows } = useFinance();
  return useMemo(
    () =>
      rows
        .filter((r) => !optimisticRows.hidden.has(r.id))
        .map((r) => {
          const patch = optimisticRows.patches.get(r.id);
          return patch ? ({ ...r, ...patch } as T) : r;
        }),
    [rows, optimisticRows],
  );
}

// Dropdown options and the record each dialog edits, from the lookup tables.
// Totals and table rows don't belong here: they come from the server per page.
export function useLookups() {
  const { state: s, lookups: l } = useFinance();

  return useMemo(() => {
    const categoryOptions = (type: TxnType) => l.categories.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const channelOptions = (type: TxnType) => l.channels.filter((c) => c.type === type).map((c) => ({ id: c.id, name: c.name }));
    const editing = <T extends { id: string }>(kind: DialogKind, list: T[]): T | null =>
      s.dialog === kind && s.editId ? (list.find((x) => x.id === s.editId) ?? null) : null;

    // New payments default to the order's last payment's category and channel,
    // else to the "Order Sales" category (added by the orders migration).
    const incomeCategories = l.categories.filter((c) => c.type === "income");
    const defaultPaymentCategoryId = (incomeCategories.find((c) => c.name === "Order Sales") ?? incomeCategories[0])?.id ?? "";
    const target = s.dialog === "payment" ? s.paymentTarget : null;
    const paymentDialog = target
      ? {
          orderNumber: target.orderNumber,
          totalDisplay: fmtMoney(target.totalPrice),
          paidDisplay: fmtMoney(target.amountPaid),
          balance: roundMoney(target.totalPrice - target.amountPaid),
          categoryId: target.categoryId ?? defaultPaymentCategoryId,
          channelId: target.channelId ?? "",
        }
      : null;

    return {
      incomeCategoryOptions: categoryOptions("income"),
      expenseCategoryOptions: categoryOptions("expense"),
      txnCategoryOptions: categoryOptions(s.txnFormType),
      txnChannelOptions: channelOptions(s.txnFormType),
      incomeChannelOptions: channelOptions("income"),
      customerOptions: l.customers.map((c) => ({ id: c.id, name: c.name })),
      sourceOptions: l.sources.map((x) => ({ id: x.id, name: x.name })),
      deliveryProviderOptions: l.deliveryProviders.map((x) => ({ id: x.id, name: x.name })),
      paymentMethodOptions: l.paymentMethods.map((x) => ({ id: x.id, name: x.name })),
      orderProductOptions: l.products.flatMap((p) =>
        p.variants.map((v) => {
          const label = variantLabel(p.optionNames, v.options);
          return { id: v.id, label: label ? `${p.name} · ${label}` : p.name, price: v.price };
        }),
      ),
      productOptionNameOptions: [...new Set(l.products.flatMap((p) => p.optionNames))].sort((a, b) => a.localeCompare(b)),
      // Options whose values come from a fixed list (keyed by lower-cased option name).
      productOptionValueOptions: { type: ["Lined", "Blank"] } as Record<string, string[]>,
      defaultPaymentCategoryId,

      editingTxn: s.dialog === "txn" ? s.editingTxn : null,
      editingBudget: editing("budget", l.budgets),
      editingInvoice: s.dialog === "invoice" ? s.editingInvoice : null,
      editingCustomer: editing("customer", l.customers),
      editingCategory: editing("category", l.categories),
      editingChannel: editing("channel", l.channels),
      editingSource: editing("source", l.sources),
      editingDeliveryProvider: editing("deliveryProvider", l.deliveryProviders),
      editingPaymentMethod: editing("paymentMethod", l.paymentMethods),
      paymentDialog,
    };
  }, [s, l]);
}
