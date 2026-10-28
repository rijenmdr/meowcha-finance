import "server-only";
import type { Customer } from "@/models/customer";
import { id, obj, str } from "./shared";

export function parseCustomer(value: unknown): Customer {
  const v = obj(value, "customer");
  return {
    id: id(v.id),
    name: str(v.name, "name", { max: 200, required: true }),
    company: str(v.company, "company", { max: 200 }),
    email: str(v.email, "email", { max: 320 }),
    phone: str(v.phone, "phone", { max: 50 }),
    notes: str(v.notes, "notes", { max: 5000 }),
  };
}
