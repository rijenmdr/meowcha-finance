import type { TxnType } from "@/enums/txn-type";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TxnType;
  categoryId: string;
  description: string;
  amount: number;
  channelId: string | null;
  sourceId: string | null; // only set on expenses
  customerId: string | null; // only set on income
  orderId: string | null; // set when this income is a payment for an order
}

export interface TxnFormValues {
  date: string;
  amount: string;
  categoryId: string;
  description: string;
  channelId: string;
}

export interface TxnSubmitValues {
  date: string;
  amount: number;
  categoryId: string;
  description: string;
  channelId: string | null;
  sourceId: string | null;
  customerId: string | null;
}

// One row of the Transactions table, formatted on the server by getTransactionsPage.
export interface TxnRow {
  id: string;
  date: string;
  dateDisplay: string;
  description: string;
  category: string;
  channel: string;
  customerName: string | null;
  sourceName: string | null;
  orderNumber: string | null;
  amount: number;
  amountDisplay: string;
  amountClass: string;
  deliveryFeeDisplay: string | null;
  tagClass: string;
  txn: Transaction;
}
