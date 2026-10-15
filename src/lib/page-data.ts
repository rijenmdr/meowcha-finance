import "server-only";
import { rpc } from "./data";
import { addDays, daysBetween, fmtDate, fmtMoney, monthsBetweenInclusive, parseDateFilter, todayISO, variantLabel } from "./format";
import { buildCashFlowBuckets, buildCategoryBreakdown, deltaBits, isMonthlyCashFlow } from "./calculations";
import { parseTableQuery, type TableQuery } from "./table-params";
import { INVOICE_STATUS_CLASSES, orderStatusCells, PAYMENT_STATUS_CLASSES, PAYMENT_STATUS_LABELS, type InvoiceStatus } from "./status";
import type { OrderStatus, PaymentStatus, TxnType } from "./types";

// One loader per dashboard page. Each sends the page's date range (and table
// page/sort) to a reporting function in schema.sql, which does the filtering
// and aggregating in Postgres, then formats the result for display.

function dateRange(params: URLSearchParams) {
  return parseDateFilter(params, todayISO());
}

function plural(n: number, word: string): string {
  return n + " " + word + (n === 1 ? "" : "s");
}

function signedAmount(type: TxnType, amount: number) {
  return {
    amountDisplay: (type === "income" ? "+" : "–") + fmtMoney(amount).replace(/^–/, ""),
    amountClass: type === "income" ? "text-accent-600" : "text-ink",
  };
}

// Fetches one page of a list function. A page past the end (after deletes, or
// from an old link) is replaced by the last page.
async function pagedRpc<T extends { total: number }>(fn: string, args: Record<string, unknown>, query: TableQuery) {
  const fetchPage = (q: TableQuery) =>
    rpc<T>(fn, { ...args, p_sort: q.sort, p_desc: q.desc, p_limit: q.pageSize, p_offset: (q.page - 1) * q.pageSize });
  const result = await fetchPage(query);
  const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize));
  if (query.page <= lastPage) return { result, query };
  const clamped = { ...query, page: lastPage };
  return { result: await fetchPage(clamped), query: clamped };
}

interface OverviewSummary {
  income: number;
  expense: number;
  prev_income: number;
  prev_expense: number;
  cash_flow: { key: string; income: number; expense: number }[];
  expense_categories: { category_id: string; name: string; amount: number }[];
  recent: { id: string; date: string; type: TxnType; description: string; amount: number }[];
}

export async function getOverviewPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  // The prior period is the same number of days, ending the day before.
  const rangeDays = daysBetween(start, end) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(rangeDays - 1));
  const s = await rpc<OverviewSummary>("overview_summary", {
    p_start: start,
    p_end: end,
    p_prev_start: prevStart,
    p_prev_end: prevEnd,
    p_monthly: isMonthlyCashFlow(start, end),
  });
  const net = s.income - s.expense;
  const buckets = buildCashFlowBuckets(s.cash_flow, start, end);
  const categoryBreakdown = buildCategoryBreakdown(
    s.expense_categories.map((c) => ({ categoryId: c.category_id, name: c.name, amount: c.amount })),
    s.expense,
  );

  return {
    incomeDisplay: fmtMoney(s.income),
    expenseDisplay: fmtMoney(s.expense),
    netDisplay: fmtMoney(net),
    incomeDelta: deltaBits(s.income, s.prev_income, true),
    expenseDelta: deltaBits(s.expense, s.prev_expense, false),
    netDelta: deltaBits(net, s.prev_income - s.prev_expense, true),
    cashFlow: buckets,
    isBarChart: buckets.length === 1,
    categoryBreakdown,
    categoryBreakdownEmpty: categoryBreakdown.length === 0,
    recentTransactions: s.recent.map((t) => ({
      id: t.id,
      description: t.description,
      dateDisplay: fmtDate(t.date),
      ...signedAmount(t.type, t.amount),
    })),
  };
}

export const TRANSACTION_SORTS = ["date", "description", "category", "channel", "amount"];

interface TransactionList {
  total: number;
  rows: {
    id: string;
    date: string;
    type: TxnType;
    category_id: string;
    description: string;
    amount: number;
    channel_id: string | null;
    source_id: string | null;
    customer_id: string | null;
    order_id: string | null;
    category_name: string;
    channel_name: string | null;
    customer_name: string | null;
    source_name: string | null;
    order_number: string | null;
  }[];
}

export async function getTransactionsPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const type = params.get("type");
  const filterType: "all" | TxnType = type === "income" || type === "expense" ? type : "all";
  const filterCategory = params.get("category") || "all";
  const { result, query } = await pagedRpc<TransactionList>(
    "list_transactions",
    {
      p_start: start,
      p_end: end,
      p_type: filterType === "all" ? null : filterType,
      p_category_id: filterCategory === "all" ? null : filterCategory,
    },
    parseTableQuery(params, TRANSACTION_SORTS, { sort: "date", desc: true }),
  );

  return {
    query,
    total: result.total,
    filterType,
    filterCategory,
    countLabel: plural(result.total, "transaction"),
    rows: result.rows.map((t) => ({
      id: t.id,
      date: t.date,
      dateDisplay: fmtDate(t.date),
      description: t.description,
      category: t.category_name,
      channel: t.channel_name ?? "—",
      customerName: t.customer_name,
      sourceName: t.source_name,
      orderNumber: t.order_number,
      amount: t.amount,
      ...signedAmount(t.type, t.amount),
      tagClass: t.type === "income" ? "bg-accent-50 text-accent-700" : "bg-mist text-graphite",
      txn: {
        id: t.id,
        date: t.date,
        type: t.type,
        categoryId: t.category_id,
        description: t.description,
        amount: t.amount,
        channelId: t.channel_id,
        sourceId: t.source_id,
        customerId: t.customer_id,
        orderId: t.order_id,
      },
    })),
  };
}

export const INVOICE_SORTS = ["client", "issueDate", "dueDate", "amount", "status"];

interface InvoiceList {
  total: number;
  outstanding: number;
  overdue_count: number;
  paid: number;
  rows: {
    id: string;
    customer_id: string | null;
    customer_name: string | null;
    issue_date: string;
    due_date: string;
    amount: number;
    paid: boolean;
    status: InvoiceStatus;
  }[];
}

export async function getInvoicesPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const { result, query } = await pagedRpc<InvoiceList>(
    "list_invoices",
    { p_start: start, p_end: end, p_today: todayISO() },
    parseTableQuery(params, INVOICE_SORTS, { sort: "issueDate", desc: true }),
  );

  return {
    query,
    total: result.total,
    outstandingDisplay: fmtMoney(result.outstanding),
    overdueCountDisplay: String(result.overdue_count),
    paidDisplay: fmtMoney(result.paid),
    rows: result.rows.map((inv) => ({
      id: inv.id,
      client: inv.customer_name ?? "—",
      issueDate: inv.issue_date,
      issueDisplay: fmtDate(inv.issue_date),
      dueDate: inv.due_date,
      dueDisplay: fmtDate(inv.due_date),
      amount: inv.amount,
      amountDisplay: fmtMoney(inv.amount),
      status: inv.status,
      statusClass: INVOICE_STATUS_CLASSES[inv.status],
      showMarkPaid: !inv.paid,
      invoice: {
        id: inv.id,
        customerId: inv.customer_id,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        amount: inv.amount,
        paid: inv.paid,
      },
    })),
  };
}

export const ORDER_SORTS = ["orderDate", "customer", "totalPrice", "amountPaid", "status"];

interface OrderList {
  total: number;
  revenue: number;
  balance_due: number;
  open_count: number;
  rows: {
    id: string;
    order_number: string;
    order_date: string;
    order_status: OrderStatus;
    delivery_charge: number;
    delivery_location: string | null;
    total_price: number;
    amount_paid: number;
    payment_status: PaymentStatus;
    customer_name: string;
    delivery_provider_name: string | null;
    payment_method_name: string | null;
    items: { quantity: number; product_name: string; option_names: string[]; options: Record<string, string> }[];
    payment_count: number;
    last_payment: { category_id: string; channel_id: string | null } | null;
  }[];
}

export async function getOrdersPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const { result, query } = await pagedRpc<OrderList>(
    "list_orders",
    { p_start: start, p_end: end },
    parseTableQuery(params, ORDER_SORTS, { sort: "orderDate", desc: true }),
  );

  return {
    query,
    total: result.total,
    orderCountDisplay: String(result.total),
    orderRevenueDisplay: fmtMoney(result.revenue),
    orderBalanceDueDisplay: fmtMoney(result.balance_due),
    openOrderCountDisplay: String(result.open_count),
    rows: result.rows.map((o) => {
      const units = o.items.reduce((a, i) => a + i.quantity, 0);
      const due = o.total_price - o.amount_paid;
      return {
        id: o.id,
        orderNumber: o.order_number,
        orderDate: o.order_date,
        dateDisplay: fmtDate(o.order_date),
        customer: o.customer_name,
        deliveryLocation: o.delivery_location,
        deliveryProvider: o.delivery_provider_name,
        paymentMethod: o.payment_method_name,
        itemsSummary: o.items
          .map((i) => {
            const label = variantLabel(i.option_names, i.options);
            return `${i.quantity} × ${label ? `${i.product_name} · ${label}` : i.product_name}`;
          })
          .join(", "),
        unitsLabel: plural(units, "unit"),
        totalPrice: o.total_price,
        totalDisplay: fmtMoney(o.total_price),
        deliveryCharge: o.delivery_charge,
        deliveryDisplay: o.delivery_charge > 0 ? "incl. " + fmtMoney(o.delivery_charge) + " delivery" : null,
        amountPaid: o.amount_paid,
        paidDisplay: fmtMoney(o.amount_paid),
        dueAmount: due,
        dueDisplay: o.payment_status === "paid" ? null : fmtMoney(due) + " due",
        ...orderStatusCells(o.order_status),
        paymentStatus: PAYMENT_STATUS_LABELS[o.payment_status],
        paymentStatusClass: PAYMENT_STATUS_CLASSES[o.payment_status],
        showRecordPayment: o.payment_status !== "paid",
        paymentCount: o.payment_count,
        paymentTarget: {
          orderId: o.id,
          orderNumber: o.order_number,
          totalPrice: o.total_price,
          amountPaid: o.amount_paid,
          categoryId: o.last_payment?.category_id ?? null,
          channelId: o.last_payment?.channel_id ?? null,
        },
      };
    }),
  };
}

type BudgetSummary = { id: string; category_id: string; category_name: string; target: number; actual: number }[];

export async function getBudgetPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const budgets = await rpc<BudgetSummary>("budget_summary", { p_start: start, p_end: end });
  // Targets are monthly, so they scale with the number of months the range touches.
  const months = monthsBetweenInclusive(start, end);
  const rows = budgets.map((b) => {
    const target = b.target * months;
    const pct = target > 0 ? (b.actual / target) * 100 : 0;
    const over = b.actual > target;
    return {
      id: b.id,
      category: b.category_name,
      target,
      targetDisplay: fmtMoney(target),
      actual: b.actual,
      actualDisplay: fmtMoney(b.actual),
      pctWidth: Math.min(100, pct) + "%",
      barClass: over ? "fill-accent-800" : "fill-accent-500",
      over,
      overAmountDisplay: fmtMoney(b.actual - target),
    };
  });
  const totalTarget = rows.reduce((a, r) => a + r.target, 0);
  const totalActual = rows.reduce((a, r) => a + r.actual, 0);

  return {
    rows,
    totalBudgetDisplay: fmtMoney(totalTarget),
    totalActualDisplay: fmtMoney(totalActual),
    totalRemainingDisplay: fmtMoney(totalTarget - totalActual),
    monthsInRangeLabel: plural(months, "month"),
  };
}

interface CustomerSummary {
  income: number;
  rows: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    in_range: number;
    lifetime: number;
    payment_count: number;
    last_date: string | null;
    order_count: number;
  }[];
}

export async function getCustomersPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<CustomerSummary>("customer_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company || "—",
    contact: [c.email, c.phone].filter(Boolean).join(" · ") || "—",
    inRangeIncome: c.in_range,
    inRangeDisplay: fmtMoney(c.in_range),
    lifetimeIncome: c.lifetime,
    lifetimeDisplay: fmtMoney(c.lifetime),
    lastDate: c.last_date ?? "",
    lastDisplay: c.last_date ? fmtDate(c.last_date) : "—",
    paymentsLabel: plural(c.payment_count, "payment"),
    orderCount: c.order_count,
  }));
  const linked = rows.reduce((a, r) => a + r.inRangeIncome, 0);
  const top = rows.reduce<(typeof rows)[number] | null>(
    (best, r) => (r.inRangeIncome > 0 && (!best || r.inRangeIncome > best.inRangeIncome) ? r : best),
    null,
  );

  return {
    rows,
    customersEmpty: rows.length === 0,
    customerCountDisplay: String(rows.length),
    customerIncomeDisplay: fmtMoney(linked),
    unlinkedIncomeDisplay: fmtMoney(s.income - linked),
    topCustomerDisplay: top ? top.name : "—",
  };
}

type CategorySummary = { id: string; name: string; type: TxnType; txn_count: number; budgeted: boolean }[];

export async function getCategoriesPage() {
  const categories = await rpc<CategorySummary>("category_summary");
  const rows = (type: TxnType) =>
    categories
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, usageCount: c.txn_count, usageLabel: plural(c.txn_count, "transaction"), budgeted: c.budgeted }));
  return { incomeRows: rows("income"), expenseRows: rows("expense") };
}

type ChannelSummary = { id: string; name: string; type: TxnType; txn_count: number }[];

export async function getChannelsPage() {
  const channels = await rpc<ChannelSummary>("channel_summary");
  const rows = (type: TxnType) =>
    channels
      .filter((c) => c.type === type)
      .map((c) => ({ id: c.id, name: c.name, usageCount: c.txn_count, usageLabel: plural(c.txn_count, "transaction") }));
  return { incomeRows: rows("income"), expenseRows: rows("expense") };
}

interface SourceSummary {
  expense: number;
  rows: { id: string; name: string; expense_count: number; in_range: number }[];
}

export async function getSourcesPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<SourceSummary>("source_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.expense_count,
    usageLabel: plural(x.expense_count, "expense"),
    inRangeSpend: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  const sourced = rows.reduce((a, r) => a + r.inRangeSpend, 0);
  return {
    rows,
    sourcesEmpty: rows.length === 0,
    sourceCountDisplay: String(rows.length),
    sourcedExpenseDisplay: fmtMoney(sourced),
    unsourcedExpenseDisplay: fmtMoney(s.expense - sourced),
  };
}

interface DeliveryProviderSummary {
  orders_without_provider: number;
  rows: { id: string; name: string; order_count: number; in_range: number }[];
}

export async function getDeliveryProvidersPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<DeliveryProviderSummary>("delivery_provider_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.order_count,
    usageLabel: plural(x.order_count, "order"),
    inRangeCharges: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  return {
    rows,
    deliveryProvidersEmpty: rows.length === 0,
    deliveryProviderCountDisplay: String(rows.length),
    providerDeliveryChargesDisplay: fmtMoney(rows.reduce((a, r) => a + r.inRangeCharges, 0)),
    ordersWithoutProviderDisplay: String(s.orders_without_provider),
  };
}

interface PaymentMethodSummary {
  orders_without_method: number;
  rows: { id: string; name: string; order_count: number; in_range: number }[];
}

export async function getPaymentMethodsPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const s = await rpc<PaymentMethodSummary>("payment_method_summary", { p_start: start, p_end: end });
  const rows = s.rows.map((x) => ({
    id: x.id,
    name: x.name,
    usageCount: x.order_count,
    usageLabel: plural(x.order_count, "order"),
    inRangeValue: x.in_range,
    inRangeDisplay: fmtMoney(x.in_range),
  }));
  return {
    rows,
    paymentMethodsEmpty: rows.length === 0,
    paymentMethodCountDisplay: String(rows.length),
    methodOrderValueDisplay: fmtMoney(rows.reduce((a, r) => a + r.inRangeValue, 0)),
    ordersWithoutMethodDisplay: String(s.orders_without_method),
  };
}

interface ProductSummary {
  units: number;
  stock_value: number;
  out_of_stock: number;
  rows: {
    id: string;
    name: string;
    option_names: string[];
    variants: { id: string; options: Record<string, string>; quantity: number; price: number }[];
    units: number;
    stock_value: number;
    order_count: number;
  }[];
}

export async function getProductsPage() {
  const s = await rpc<ProductSummary>("product_summary");
  const rows = s.rows.map((p) => ({
    id: p.id,
    name: p.name,
    optionsLabel: p.option_names.join(", "),
    variantCount: p.variants.length,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: variantLabel(p.option_names, v.options) || "Default",
      quantityDisplay: String(v.quantity),
      quantityClass: v.quantity === 0 ? "text-error" : "text-ink",
      priceDisplay: fmtMoney(v.price),
    })),
    quantity: p.units,
    quantityDisplay: String(p.units),
    stockValue: p.stock_value,
    stockValueDisplay: fmtMoney(p.stock_value),
    orderCount: p.order_count,
  }));
  return {
    rows,
    productsEmpty: rows.length === 0,
    productCountDisplay: String(rows.length),
    unitsInStockDisplay: String(s.units),
    stockValueDisplay: fmtMoney(s.stock_value),
    outOfStockDisplay: String(s.out_of_stock),
  };
}
