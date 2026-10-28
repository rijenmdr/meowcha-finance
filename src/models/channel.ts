import type { TxnType } from "@/enums/txn-type";

export interface Channel {
  id: string;
  name: string;
  type: TxnType;
}

export interface ChannelSubmitValues {
  name: string;
  type: TxnType;
}
