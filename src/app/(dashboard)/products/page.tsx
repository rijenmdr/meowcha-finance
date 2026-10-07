"use client";

import { useDashboardData } from "@/lib/finance-context";
import { StatCard } from "@/components/StatCard";
import { ProductsTable } from "@/components/ProductsTable";

export default function ProductsPage() {
  const data = useDashboardData();

  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Products" value={data.productCountDisplay} />
        <StatCard label="Units in stock" value={data.unitsInStockDisplay} />
        <StatCard label="Stock value" value={data.stockValueDisplay} tinted />
        <StatCard label="Variants out of stock" value={data.outOfStockDisplay} />
      </div>
      <ProductsTable rows={data.productRows} empty={data.productsEmpty} />
    </div>
  );
}
