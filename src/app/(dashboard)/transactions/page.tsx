"use client";

import { useDashboardData, useFinance } from "@/lib/finance-context";
import { TransactionsTable } from "@/components/TransactionsTable";

export default function TransactionsPage() {
  const { state } = useFinance();
  const data = useDashboardData();

  return (
    <TransactionsTable
      rows={data.transactionsList}
      incomeCategories={data.incomeCategoryOptions}
      expenseCategories={data.expenseCategoryOptions}
      filterType={state.filterType}
      filterCategory={state.filterCategory}
      countLabel={data.transactionsCountLabel}
      empty={data.transactionsEmpty}
    />
  );
}
