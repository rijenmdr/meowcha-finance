import "server-only";
import { TRANSACTION_SORTS } from "@/constants/table-sorts";
import type { TxnType } from "@/enums/txn-type";
import { dateRange } from "@/lib/helpers/date-filter";
import { signedAmount } from "@/lib/helpers/signed-amount";
import { parseTableQuery } from "@/lib/helpers/table-params";
import { pagedRpc, rpc } from "@/lib/supabase/rpc";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";
import { plural } from "@/lib/utils/plural";

interface TransactionList {
  total: number;
  income?: number;
  expense?: number;
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
    delivery_fee?: number; // missing until migration 018
  }[];
}

export async function getTransactionsPage(params: URLSearchParams) {
  const { start, end } = dateRange(params);
  const type = params.get("type");
  const filterType: "all" | TxnType = type === "income" || type === "expense" ? type : "all";
  const filterCategory = params.get("category") || "all";
  const listArgs = {
    p_start: start,
    p_end: end,
    p_type: filterType === "all" ? null : filterType,
    p_category_id: filterCategory === "all" ? null : filterCategory,
  };
  const { result, query } = await pagedRpc<TransactionList>(
    "list_transactions",
    listArgs,
    parseTableQuery(params, TRANSACTION_SORTS, { sort: "date", desc: true }),
  );

  let income = Number(result.income ?? 0);
  let expense = Number(result.expense ?? 0);

  // Backward-compatible fallback while older databases still return only rows.
  if (result.income == null || result.expense == null) {
    const allRows =
      result.total <= result.rows.length
        ? result.rows
        : (
            await rpc<Pick<TransactionList, "rows">>("list_transactions", {
              ...listArgs,
              p_sort: "date",
              p_desc: true,
              p_limit: result.total,
              p_offset: 0,
            })
          ).rows;
    income = allRows.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    expense = allRows.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  }

  return {
    query,
    total: result.total,
    filterType,
    filterCategory,
    countLabel: plural(result.total, "transaction"),
    incomeDisplay: fmtMoney(income),
    expenseDisplay: fmtMoney(expense),
    cashFlowDisplay: fmtMoney(income - expense),
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
      // The part of a payment that is a delivered order's outside delivery charge, not income.
      deliveryFeeDisplay: t.delivery_fee && t.delivery_fee > 0 ? "incl. " + fmtMoney(t.delivery_fee) + " delivery" : null,
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
