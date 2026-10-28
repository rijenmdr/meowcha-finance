import "server-only";
import type { Transaction } from "@/models/transaction";
import { date, id, num, obj, str, txnType } from "./shared";

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
