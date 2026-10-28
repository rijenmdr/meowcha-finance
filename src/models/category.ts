import type { TxnType } from "@/enums/txn-type";

export interface Category {
  id: string;
  name: string;
  type: TxnType;
}

export interface CategorySubmitValues {
  name: string;
  type: TxnType;
}
