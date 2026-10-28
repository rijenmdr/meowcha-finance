import type { TxnType } from "@/enums/txn-type";
import { fmtMoney } from "@/lib/utils/format-money";

export function signedAmount(type: TxnType, amount: number) {
  return {
    amountDisplay: (type === "income" ? "+" : "–") + fmtMoney(amount).replace(/^–/, ""),
    amountClass: type === "income" ? "text-accent-600" : "text-ink",
  };
}
