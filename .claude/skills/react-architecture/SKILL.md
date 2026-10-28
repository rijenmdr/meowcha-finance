---
name: react-architecture
description: Folder structure, file naming, and React/Next.js patterns for this repo — where code goes (app, components/ui|shared|containers, hooks, stores, enums, constants, models, lib/actions|queries|validators|helpers|utils|supabase), server vs client components, server actions, Zustand, custom hooks, useEffect, and readability rules. Use whenever creating or moving a page, component, hook, store, type, or server action, or reviewing a diff for structure.
when_to_use: Trigger on "new page", "new component", "new hook", "add a store", "server action", "where should this go", "refactor", "split this component", "use client", "useEffect", "zustand", "prop drilling", "folder structure", "naming", "migrate".
---

# React architecture — meowcha finance

> The codebase follows this structure. Two deliberate deviations: `components/shared/` has
> `layout/` and `dialogs/` subfolders, and the lookup tables are shared through one React
> context (`components/shared/lookups-provider.tsx`), since they are server data and must
> not go in a Zustand store.

## Principles

1. **Readable for everyone.** A teammate new to React should follow any file top to bottom.
2. **Server first.** Data lives on the server. The client holds only UI state.
3. **Small pieces.** One concept per file, one job per function.

## Folder structure

```
src/
  app/                          routes only: page.tsx, layout.tsx, loading.tsx, error.tsx
  components/
    ui/                         atomic primitives (shadcn): button.tsx, input.tsx
    shared/                     used by 2+ routes: data-table.tsx, panel.tsx
    containers/
      orders/                   one folder per top-level route segment
        orders-container.tsx    the page's entry component (only file with -container)
        order-row-actions.tsx   children of that page, no suffix
  hooks/
    use-order-form.ts           UI logic hooks live at the root
    mutations/                  (future) server action + pending/optimistic state
    queries/                    (future) client fetching, only for polling and the like
  stores/                       zustand, one small store per feature: use-dialog-store.ts
  enums/                        as-const objects + union types: order-status.ts
  constants/                    fixed values: pagination.ts
  models/                       type definitions, one file per entity: order.ts
  lib/
    actions/                    "use server" mutations, one file per entity: order.ts
    queries/                    server-only reads, one file per entity: order.ts
    validators/                 server-only parseX() input parsers: order.ts
    helpers/                    domain-specific pure functions: order-total.ts
    utils/                      generic pure functions: cn.ts, format-date.ts
    supabase/                   server.ts, browser.ts, auth.ts
```

### Where does this code go?

| The code… | Goes in |
| --- | --- |
| Is a route entry (URL) | `app/**/page.tsx` |
| Renders one route's UI | `components/containers/<route>/` |
| Is UI used by 2+ routes | `components/shared/` |
| Is a styled primitive with no domain knowledge | `components/ui/` |
| Holds stateful UI logic (2+ related state/effects, or reused) | `hooks/use-x.ts` |
| Holds client state shared by several components | `stores/use-x-store.ts` |
| Writes to the database | `lib/actions/<entity>.ts` |
| Reads from the database | `lib/queries/<entity>.ts` |
| Checks untrusted input | `lib/validators/<entity>.ts` |
| Is pure logic that knows about orders, invoices, etc. | `lib/helpers/` |
| Is pure logic you could copy into any project | `lib/utils/` |
| Is a set of allowed string values | `enums/` |
| Is a fixed value (page size, limits) | `constants/` |
| Is a TypeScript type/interface | `models/<entity>.ts` |

### Dependency direction

- `ui/` imports nothing from `shared/` or `containers/`.
- `shared/` never imports from `containers/`.
- A container never imports from **another route's** container folder. As soon as a
  second route needs a component, move it to `shared/`.
- `lib/helpers` and `lib/utils` never import React, Supabase, or `lib/actions`.
- Client code never imports `lib/queries`, `lib/validators`, or `lib/supabase/server.ts`.

## Naming

- **Files and folders are kebab-case**: `order-row-actions.tsx`, `use-order-form.ts`,
  `use-dialog-store.ts`. Identifiers stay conventional: `OrderRowActions`, `useOrderForm`,
  `ORDER_STATUSES`.
- Named exports everywhere. Only Next's special files (`page`, `layout`, `loading`,
  `error`, `not-found`) use `export default`.
- Entity files are singular: `lib/actions/order.ts`, `models/order.ts`. Split one only
  when it passes ~300 lines.
- Hooks start with `use-`, stores end with `-store`, the page entry ends with `-container`.

## Pages (`app/`)

A page may only:

- read `params` / `searchParams` (parse them with one helper call)
- call `lib/queries`
- export `metadata`
- call `notFound()` / `redirect()`
- render **one** container, passing it data and server actions as props

There is no inline `"use server"`, no data shaping, and no other JSX.

```tsx
// app/(dashboard)/orders/page.tsx
import { OrdersContainer } from "@/components/containers/orders/orders-container";
import { getOrdersPage } from "@/lib/queries/order";
import { deleteOrderAction } from "@/lib/actions/order";
import { parseTableParams } from "@/lib/helpers/table-params";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const params = parseTableParams(await searchParams);
  const orders = await getOrdersPage(params);

  return <OrdersContainer orders={orders} onDelete={deleteOrderAction} />;
}
```

## Server vs client components

- Every component is a **server component** unless it needs state, effects, event
  handlers, or browser APIs.
- Put `"use client"` on the **smallest** component that needs it, not on its parent.
  A container stays a server component and renders small client children.
- A server component can pass server components to a client component as `children`.

## Server state

- Reads happen on the server (`lib/queries`) and reach the client as props.
- Writes go through server actions (`lib/actions`). The action calls `refresh()`, and the
  server re-renders with fresh data. Don't keep a client copy of server data.
- **No client fetching** by default. Use it (in `hooks/queries/`) only for polling or
  other data the server render cannot provide.
- Never put server data in a Zustand store.

### Server action contract

Every action, in this order:

```ts
"use server";

export async function deleteOrderAction(rawId: unknown) {
  await requireSession();                 // 1. auth
  const id = parseId(rawId);              // 2. validate untrusted input
  const { error } = await getSupabase()   // 3. db call (camelCase → snake_case)
    .from("orders")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message); // 4. throw on error
  refresh();                              // 5. re-render with fresh data
}
```

### Passing actions down

- Pass server actions from the page to the container as props.
- If an action would travel through **more than three levels** of props, import it
  directly in the component (or hook) that calls it instead.

## Client state

| Need | Use |
| --- | --- |
| State used by one component, or one parent → child | `useState` |
| Client state shared by several components | Zustand store in `stores/` |
| Server data | Props from the server. Never client state |
| Third-party providers (theme, toasts) | Context. This is the only use of context |

```ts
// stores/use-dialog-store.ts
import { create } from "zustand";

interface DialogState {
  openDialog: string | null;
  open: (dialog: string) => void;
  close: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  openDialog: null,
  open: (dialog) => set({ openDialog: dialog }),
  close: () => set({ openDialog: null }),
}));
```

- Keep each store small and specific to one feature.
- Select only what you need: `useDialogStore((state) => state.close)`.
- Stores are module singletons, so use them only in client components and never read
  them during a server render.

## Custom hooks

- Write a hook when the logic has **2+ related pieces of state/effects**, or when it is
  reused. A single `useState` toggle stays inline.
- A hook returns plain values and functions, so the component only renders.
- (Future) `hooks/mutations/use-x.ts` wraps a server action with `useTransition` /
  `useOptimistic` and exposes `{ run, isPending, error }`.

```ts
// hooks/use-order-items.ts
import { useState } from "react";
import { calculateOrderTotal } from "@/lib/helpers/order-total";
import type { OrderItem } from "@/models/order";

export function useOrderItems(initialItems: OrderItem[]) {
  const [items, setItems] = useState(initialItems);

  function addItem(item: OrderItem) {
    setItems((current) => [...current, item]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const total = calculateOrderTotal(items);

  return { items, addItem, removeItem, total };
}
```

## useEffect

Use `useEffect` **only to sync with something outside React**: subscriptions, timers,
browser APIs, third-party widgets. Don't use it for:

- **Derived values.** Calculate them during render.
- **Responding to an event.** Do the work in the event handler.
- **Resetting state when a prop changes.** Give the component a `key` instead.
- **Fetching data.** Fetch in a server component.

```tsx
// Bad: effect + extra state for a derived value
const [total, setTotal] = useState(0);
useEffect(() => setTotal(calculateOrderTotal(items)), [items]);

// Good: derive during render
const total = calculateOrderTotal(items);
```

## Enums, constants, models

```ts
// enums/order-status.ts
export const ORDER_STATUS = {
  requested: "requested",
  processing: "processing",
  delivered: "delivered",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
```

- Use `as const` objects plus a union type, never TypeScript `enum`.
- `constants/` holds plain fixed values (`DEFAULT_PAGE_SIZE = 20`).
- `models/` holds only types. Form values are `XFormValues` and submit payloads are
  `XSubmitValues`. Use `import type` when importing them.

## Keep it simple and readable

Soft limits. Treat going over one as a signal to split the code:

- about 150 lines per component file
- about 40 lines per function
- 5 or fewer props
- 3 or fewer levels of conditional JSX nesting
- one exported component per file

Readability rules:

- **Descriptive full names**: `orderTotal`, not `ot`. `isOverdue`, not `flag`.
- **Early returns** instead of nested `if`s.
- **No nested ternaries.** Extract a variable or a small component instead.
- **Name complex conditions**: `const isOverdue = dueDate < today && status !== "paid";`
- **No clever one-liners.** A plain loop or two simple steps beat a dense `reduce`.
- **Comments only explain *why***, never what the code does.

```tsx
// Bad
{loading ? <Spinner /> : error ? <ErrorText /> : items.length ? <List /> : <Empty />}

// Good
if (isLoading) return <Spinner />;
if (error) return <ErrorText message={error} />;
if (items.length === 0) return <Empty />;
return <List items={items} />;
```

## Checklist for a new feature

1. Types go in `models/<entity>.ts`, and allowed values in `enums/`.
2. Reads go in `lib/queries/<entity>.ts`, writes in `lib/actions/<entity>.ts`, and input
   parsing in `lib/validators/<entity>.ts`.
3. The page goes in `app/.../page.tsx`. It parses params, queries, and renders one container.
4. The container goes in `components/containers/<route>/<route>-container.tsx` and stays
   a server component.
5. Interactive pieces are small `"use client"` children. Pull their logic into
   `hooks/` once it grows past simple state.
6. Shared client state goes in a Zustand store, and only when several components need it.
7. Check that every file name is kebab-case and that no file imports against the
   dependency rules above.
