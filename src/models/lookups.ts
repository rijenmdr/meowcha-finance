import type { Budget } from "./budget";
import type { Category } from "./category";
import type { Channel } from "./channel";
import type { Customer } from "./customer";
import type { DeliveryProvider } from "./delivery-provider";
import type { PaymentMethod } from "./payment-method";
import type { Product } from "./product";
import type { ProductCategory } from "./product-category";
import type { Source } from "./source";

// The small reference tables the dashboard layout loads once, for dropdowns,
// dialogs and duplicate checks. Everything that grows with use (transactions,
// orders, invoices) is queried per page instead.
export interface Lookups {
  categories: Category[];
  channels: Channel[];
  sources: Source[];
  customers: Customer[];
  deliveryProviders: DeliveryProvider[];
  paymentMethods: PaymentMethod[];
  productCategories: ProductCategory[];
  products: Product[];
  budgets: Budget[];
}
