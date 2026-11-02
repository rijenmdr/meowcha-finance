import type { Budget } from "./budget";
import type { Category } from "./category";
import type { Channel } from "./channel";
import type { DeliveryProvider } from "./delivery-provider";
import type { PaymentMethod } from "./payment-method";
import type { ProductCategory } from "./product-category";
import type { Source } from "./source";

// The small reference tables the dashboard layout loads once, for dropdowns,
// dialogs and duplicate checks. Everything that grows with use (transactions,
// orders, invoices, customers, products) is queried per page or searched on demand instead.
export interface Lookups {
  categories: Category[];
  channels: Channel[];
  sources: Source[];
  deliveryProviders: DeliveryProvider[];
  paymentMethods: PaymentMethod[];
  productCategories: ProductCategory[];
  productOptionNames: string[];
  budgets: Budget[];
}
