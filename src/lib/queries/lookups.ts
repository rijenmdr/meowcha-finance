import "server-only";
import type { Lookups } from "@/models/lookups";
import { getBudgets } from "./budget";
import { getCategories } from "./category";
import { getChannels } from "./channel";
import { getCustomers } from "./customer";
import { getDeliveryProviders } from "./delivery-provider";
import { getPaymentMethods } from "./payment-method";
import { getProducts } from "./product";
import { getProductCategories } from "./product-category";
import { getSources } from "./source";

export async function getLookups(): Promise<Lookups> {
  const [categories, channels, sources, customers, deliveryProviders, paymentMethods, productCategories, products, budgets] = await Promise.all([
    getCategories(),
    getChannels(),
    getSources(),
    getCustomers(),
    getDeliveryProviders(),
    getPaymentMethods(),
    getProductCategories(),
    getProducts(),
    getBudgets(),
  ]);
  return { categories, channels, sources, customers, deliveryProviders, paymentMethods, productCategories, products, budgets };
}
