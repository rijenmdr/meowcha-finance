import "server-only";
import type { PaymentMethod } from "@/models/payment-method";
import { id, obj, str } from "./shared";

export function parsePaymentMethod(value: unknown): PaymentMethod {
  const v = obj(value, "payment method");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 100, required: true }),
  };
}
