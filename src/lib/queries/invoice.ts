import "server-only";
import { INVOICE_STATUS_CLASSES } from "@/constants/invoice-status";
import { INVOICE_SORTS } from "@/constants/table-sorts";
import type { InvoiceStatus } from "@/enums/invoice-status";
import { dateRange } from "@/lib/helpers/date-filter";
import { parseTableQuery } from "@/lib/helpers/table-params";
import { pagedRpc } from "@/lib/supabase/rpc";
import { todayISO } from "@/lib/utils/date-math";
import { fmtDate } from "@/lib/utils/format-date";
import { fmtMoney } from "@/lib/utils/format-money";

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
