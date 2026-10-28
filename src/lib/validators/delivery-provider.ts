import "server-only";
import type { DeliveryProvider } from "@/models/delivery-provider";
import { id, obj, str } from "./shared";

export function parseDeliveryProvider(value: unknown): DeliveryProvider {
  const v = obj(value, "delivery provider");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}
