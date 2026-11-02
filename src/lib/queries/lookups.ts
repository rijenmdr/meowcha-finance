import "server-only";
import type { Lookups } from "@/models/lookups";
import { getBudgets } from "./budget";
import { getCategories } from "./category";
import { getChannels } from "./channel";
import { getDeliveryProviders } from "./delivery-provider";
import { getPaymentMethods } from "./payment-method";
import { getProductOptionNames } from "./product";
import { getProductCategories } from "./product-category";
import { getSources } from "./source";

export async function getLookups(): Promise<Lookups> {
  const [categories, channels, sources, deliveryProviders, paymentMethods, productCategories, productOptionNames, budgets] = await Promise.all([
    getCategories(),
    getChannels(),
    getSources(),
    getDeliveryProviders(),
    getPaymentMethods(),
    getProductCategories(),
    getProductOptionNames(),
    getBudgets(),
  ]);
  return { categories, channels, sources, deliveryProviders, paymentMethods, productCategories, productOptionNames, budgets };
}
