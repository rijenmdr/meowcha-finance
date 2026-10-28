export const TXN_TYPE = {
  income: "income",
  expense: "expense",
} as const;
export type TxnType = (typeof TXN_TYPE)[keyof typeof TXN_TYPE];
