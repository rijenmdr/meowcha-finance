import "server-only";
import { PAYMENT_STATUS_CLASSES, PAYMENT_STATUS_LABELS } from "@/constants/payment-status";
import { ORDER_SORTS, REQUEST_SORTS } from "@/constants/table-sorts";
import type { OrderStatus } from "@/enums/order-status";
import type { PaymentStatus } from "@/enums/payment-status";
import type { Order } from "@/models/order";
import { dateRange } from "@/lib/helpers/date-filter";
import { orderStatusCells } from "@/lib/helpers/order-status-cells";
import { parseOrdersTab, parseTableQuery } from "@/lib/helpers/table-params";
import { variantLabel } from "@/lib/helpers/variant-label";
import { pagedRpc } from "@/lib/supabase/rpc";
import { getSupabase } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

// One order with its items and advance payment, for the order editor.
export async function getOrder(id: string): Promise<Order | null> {
  const db = getSupabase();
  const [{ data: row, error }, { data: advance, error: advanceError }] = await Promise.all([
    db
      .from("orders")
      .select(
        "id, order_number, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id, total_price, amount_paid, payment_status, requested_date, note, order_items (id, variant_id, quantity, sub_total, stock_tracked)",
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("transactions").select("id, date, amount, category_id, channel_id").eq("order_id", id).eq("is_advance", true).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (advanceError) throw new Error(advanceError.message);
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    orderDate: row.order_date,
    status: row.order_status,
    items: (row.order_items ?? []).map((item: { id: string; variant_id: string; quantity: number; sub_total: number }) => ({
      id: item.id,
      variantId: item.variant_id,
      quantity: item.quantity,
      subTotal: item.sub_total,
    })),
    subTotal: row.sub_total,
    stockTracked: (row.order_items ?? []).every((item: { stock_tracked: boolean }) => item.stock_tracked),
    deliveryCharge: row.delivery_charge,
    deliveryLocation: row.delivery_location,
    deliveryProviderId: row.delivery_provider_id,
    paymentMethodId: row.payment_method_id,
    totalPrice: row.total_price,
    amountPaid: row.amount_paid,
    paymentStatus: row.payment_status,
    requestedDate: row.requested_date,
    note: row.note,
    advance: advance
      ? { id: advance.id, date: advance.date, amount: advance.amount, categoryId: advance.category_id, channelId: advance.channel_id }
      : null,
  };
}

// The Orders tab's status filter. Requests have their own tab.
const ORDER_FILTER_STATUSES: readonly OrderStatus[] = ["processing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"];

interface OrderList {
  total: number;
  order_count: number;
  revenue: number;
  balance_due: number;
  open_count: number;
  pending_count: number;
  request_value: number;
  advance_total: number;
  rows: {
    id: string;
    order_number: string;
    order_date: string;
    order_status: OrderStatus;
    requested_date: string | null;
    note: string | null;
    delivery_charge: number;
    delivery_location: string | null;
    total_price: number;
    amount_paid: number;
    payment_status: PaymentStatus;
    customer_name: string;
    delivery_provider_name: string | null;
    payment_method_name: string | null;
    items: { quantity: number; product_name: string; option_names: string[]; options: Record<string, string> }[];
    tracked_units: number;
    payment_count: number;
    advance_amount: number | null;
    last_payment: { category_id: string; channel_id: string | null } | null;
  }[];
}

export async function getOrdersPage(params: URLSearchParams) {
  const tab = parseOrdersTab(params);
  const isRequests = tab === "requests";
  const { start, end } = dateRange(params);
  const search = (params.get("q") ?? "").trim();
  const orderStatus = params.get("orderStatus");
  const paymentStatus = params.get("paymentStatus");
  const filterOrderStatus: OrderStatus | "all" =
    !isRequests && ORDER_FILTER_STATUSES.includes(orderStatus as OrderStatus) ? (orderStatus as OrderStatus) : "all";
  const filterPaymentStatus: PaymentStatus | "all" =
    !isRequests && (paymentStatus === "paid" || paymentStatus === "partially_paid") ? paymentStatus : "all";
  const { result, query } = await pagedRpc<OrderList>(
    "list_orders",
    {
      p_tab: tab,
      p_start: start,
      p_end: end,
      p_search: search || null,
      p_order_status: filterOrderStatus === "all" ? null : filterOrderStatus,
      p_payment_status: filterPaymentStatus === "all" ? null : filterPaymentStatus,
    },
    isRequests
      ? parseTableQuery(params, REQUEST_SORTS, { sort: "requestedDate", desc: false })
      : parseTableQuery(params, ORDER_SORTS, { sort: "orderDate", desc: true }),
  );

  return {
    tab,
    query,
    search,
    filterOrderStatus,
    filterPaymentStatus,
    total: result.total,
    orderCountDisplay: String(result.order_count),
    orderRevenueDisplay: fmtMoney(result.revenue),
    orderBalanceDueDisplay: fmtMoney(result.balance_due),
    openOrderCountDisplay: String(result.open_count),
    pendingRequestCountDisplay: String(result.pending_count),
    requestValueDisplay: fmtMoney(result.request_value),
    advanceTotalDisplay: fmtMoney(result.advance_total),
    rows: result.rows.map((o) => {
      const units = o.items.reduce((a, i) => a + i.quantity, 0);
      const due = o.total_price - o.amount_paid;
      const isRequest = o.order_status === "requested";
      const isCancelled = o.order_status === "cancelled";
      return {
        id: o.id,
        orderNumber: o.order_number,
        orderDate: o.order_date,
        dateDisplay: fmtDate(o.order_date),
        requestedDate: o.requested_date,
        requestedDisplay: o.requested_date ? fmtDate(o.requested_date) : null,
        note: o.note,
        isRequest,
        fromRequest: !isRequest && o.requested_date !== null,
        canEdit: !isCancelled,
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
        // A request holds only its advance (edited in the editor), and a cancelled order takes no payments.
        canRecordPayment: !isRequest && !isCancelled && o.payment_status !== "paid",
        paymentCount: o.payment_count,
        trackedUnits: o.tracked_units,
        advanceAmount: o.advance_amount,
        advanceDisplay: o.advance_amount !== null ? fmtMoney(o.advance_amount) : "—",
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
