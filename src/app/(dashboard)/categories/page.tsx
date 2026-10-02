"use client";

import { useDashboardData } from "@/lib/finance-context";
import { CategoriesTable } from "@/components/CategoriesTable";

export default function CategoriesPage() {
  const data = useDashboardData();

  return (
    <div className="grid grid-cols-2 items-start gap-4.5">
      <CategoriesTable type="income" rows={data.incomeCategoryRows} />
      <CategoriesTable type="expense" rows={data.expenseCategoryRows} />
    </div>
  );
}
