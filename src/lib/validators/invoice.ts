import "server-only";
import type { Invoice } from "@/models/invoice";
import { date, fail, id, num, obj } from "./shared";

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
