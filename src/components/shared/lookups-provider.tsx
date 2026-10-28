"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lookups } from "@/models/lookups";

// The small reference tables the dashboard layout loads on the server. They are
// server data, so they arrive as props and are shared by context, not a store.
const LookupsContext = createContext<Lookups | null>(null);

export function LookupsProvider({ lookups, children }: { lookups: Lookups; children: ReactNode }) {
  return <LookupsContext.Provider value={lookups}>{children}</LookupsContext.Provider>;
}

export function useLookupTables(): Lookups {
  const lookups = useContext(LookupsContext);
  if (!lookups) throw new Error("useLookupTables must be used within a LookupsProvider");
  return lookups;
}
