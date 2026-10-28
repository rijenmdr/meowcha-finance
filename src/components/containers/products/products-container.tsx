import type { getProductsPage } from "@/lib/queries/product";
import { StatCard } from "@/components/shared/stat-card";
import { ProductsTable } from "./products-table";

type ProductsPageData = Awaited<ReturnType<typeof getProductsPage>>;

export function ProductsContainer({ data }: { data: ProductsPageData }) {
  return (
    <div>
      <div className="mb-4.5 grid grid-cols-4 gap-4.5">
        <StatCard label="Products" value={data.productCountDisplay} />
        <StatCard label="Units in stock" value={data.unitsInStockDisplay} />
        <StatCard label="Stock value" value={data.stockValueDisplay} tinted />
        <StatCard label="Variants out of stock" value={data.outOfStockDisplay} />
      </div>
      <ProductsTable rows={data.rows} empty={data.productsEmpty} filterCategory={data.filterCategory} />
    </div>
  );
}
