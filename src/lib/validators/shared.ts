import "server-only";
import type { TxnType } from "@/enums/txn-type";

// Server actions are public POST endpoints: their arguments arrive as untrusted
// data regardless of the TypeScript signatures. The parsers in lib/validators
// check each field and return a fresh object containing only the known columns.

export function fail(field: string): never {
  throw new Error(`Invalid ${field}`);
}

export function obj(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(field);
  return value as Record<string, unknown>;
}

export function str(value: unknown, field: string, { max = 500, required = false } = {}): string {
  if (typeof value !== "string" || value.length > max) fail(field);
  if (required && value.trim() === "") fail(field);
  return value;
}

export function id(value: unknown, field = "id"): string {
  return str(value, field, { max: 100, required: true });
}

export function num(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e12) fail(field);
  return value;
}

export function date(value: unknown, field: string): string {
  const s = str(value, field, { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) fail(field);
  return s;
}

export function txnType(value: unknown): TxnType {
  if (value !== "income" && value !== "expense") fail("type");
  return value;
}
