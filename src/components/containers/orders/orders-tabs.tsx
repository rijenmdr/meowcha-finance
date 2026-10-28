"use client";

import { useOptimistic, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlSearch } from "@/hooks/use-url-search";
import { ORDERS_TAB_RESET } from "@/constants/orders-tab";
import type { OrdersTab } from "@/enums/orders-tab";

// Orders | Requests, kept in the URL (?tab=requests). The server renders only
// the active tab's content; the trigger switches at once while it loads.
export function OrdersTabs({ tab, children }: { tab: OrdersTab; children: ReactNode }) {
  const { setSearch } = useUrlSearch();
  const [shownTab, setShownTab] = useOptimistic(tab);

  function selectTab(value: string) {
    const next: OrdersTab = value === "requests" ? "requests" : "orders";
    setSearch({ ...ORDERS_TAB_RESET, q: null, tab: next === "requests" ? next : null }, () => setShownTab(next));
  }

  return (
    <Tabs value={shownTab} onValueChange={selectTab} className="gap-4.5">
      <TabsList variant="line">
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="requests">Requests</TabsTrigger>
      </TabsList>
      <TabsContent value={shownTab}>{children}</TabsContent>
    </Tabs>
  );
}
