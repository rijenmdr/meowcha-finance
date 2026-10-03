# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

---

# Meowcha Finance Dashboard

A single-admin finance dashboard for a small bookbinding business. It covers transactions, budgets, invoices, customers and categories. Amounts are in Nepali Rupees (`Rs`, lakh/crore grouping).

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** in strict mode
- **Supabase Auth**: email/password sign-in with server-side session checks and a single admin account
- **Supabase** (Postgres) through `@supabase/supabase-js`, used **only on the server** with the service role key
- **@supabase/ssr** for browser sign-in and cookie-based session refresh
- ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)
- **Tailwind CSS v4** (`@tailwindcss/postcss`): utility classes only, with design tokens in `globals.css` `@theme`

## Commands

```bash
npm run dev     # start dev server (also regenerates the block at the top of this file)
npm run build   # production build — run this to type-check
npm run lint    # eslint
```

There is no test suite yet.

## Project structure

```
src/
  app/
    layout.tsx               # root layout: fonts (Barlow, Barlow Condensed)
    page.tsx                 # redirects "/" → "/overview"
    globals.css              # Tailwind import, @theme design tokens, a few base rules
    login/page.tsx           # client-side sign-in form
    (dashboard)/             # route group: every authenticated page
      layout.tsx             # auth check, loads all data, wraps in FinanceProvider + shell
      overview/ orders/ transactions/ budget/ invoices/ customers/ categories/ channels/ sources/ products/ delivery-providers/ payment-methods/
  proxy.ts                   # route gate (Next 16's replacement for middleware.ts)
  components/                # flat folder of UI components (no subfolders)
  lib/
    types.ts                 # domain types (Transaction, Budget, Invoice, Customer, Category…)
    supabase.ts              # server-only Supabase client singleton (service role)
    supabase-auth.ts         # server-side Supabase auth/session checks
    supabase-browser.ts      # browser Supabase client for login/sign-out
    data.ts                  # server-only read queries (getX / getDashboardData)
    actions.ts               # "use server" mutations (saveXAction / deleteXAction)
    validate.ts              # server-only runtime parsers for action inputs
    finance-context.tsx      # client-side store: state, dialogs, derived dashboard data
    calculations.ts          # pure aggregation helpers (charts, breakdowns, deltas)
    format.ts                # pure formatting/date helpers (fmtMoney, fmtDate, monthKey…)
    cx.ts                    # cx() class-name joiner for Tailwind classes
    mock-data.ts             # TODAY constant and the chart color ramp (Tailwind fill classes)
supabase/
  schema.sql                 # current full schema + RLS, for new databases
  migrations/                # numbered one-off scripts that upgrade existing databases
  seed.sql                   # optional demo data
```

## Architecture and data flow

1. **Auth gate.** `src/proxy.ts` sends unauthenticated requests to `/login`. `(dashboard)/layout.tsx` checks the Supabase user again as defense in depth. Keep both checks.
2. **Reads.** The dashboard layout (`dynamic = "force-dynamic"`) calls `getDashboardData()` from `lib/data.ts` once, inside a `<Suspense>` boundary (`DashboardContent`), and passes the results into `FinanceProvider` as `initial*` props. TopNav and Sidebar stream first and `DashboardSkeleton` fills the content area until the data arrives. A `loading.tsx` would not cover this, because it doesn't wrap its own segment's layout.
3. **Client state.** `lib/finance-context.tsx` holds all records in React state. Pages are client components that read from `useDashboardData()` (derived, display-ready values) and `useFinance()` (state + mutators such as `submitInvoice`, `closeDialog`).
4. **Writes.** Dialog submits (`submitX`) are async: they `await` the server action, then commit to local state and close the dialog, so a failed save leaves the dialog open with an error. Deletes and `markInvoicePaid` stay **optimistic**: they update local state first and call the action without waiting (`.catch(console.error)`). New IDs come from `crypto.randomUUID()` on the client.
5. **Server actions.** Every action in `lib/actions.ts` must:
   - call `requireSession()` first
   - send the input through a `parseX()` from `lib/validate.ts`, because action arguments are untrusted and TS types are not enforced at runtime
   - map camelCase fields to snake_case columns
   - `throw new Error(error.message)` on a Supabase error
6. **Dialogs.** One `DialogHost` renders the active dialog based on `state.dialog` (`DialogKind`) and `state.editId`. It is keyed by `dialog-editId` so uncontrolled forms (`defaultValue`) reset. `DialogOverlay` owns the submit lifecycle: it passes `FormData` to the dialog's `onSubmit`, disables the fields in a `<fieldset>` and shows "Saving…" while the returned promise is pending. It also renders the Cancel/Save buttons and the error message.

### Adding a new entity (checklist)

1. Add the table to `supabase/schema.sql` with RLS enabled and **no policies**. If existing databases need converting, add a numbered script to `supabase/migrations/`.
2. Add the type to `lib/types.ts` and a `DialogKind` member if it needs a dialog.
3. Add `getX()` to `lib/data.ts` (map snake_case → camelCase) and include it in `getDashboardData()`.
4. Add `parseX()` to `lib/validate.ts`, then `saveXAction` / `deleteXAction` to `lib/actions.ts`.
5. Wire state, mutators and derived values into `finance-context.tsx`.
6. Add `XTable.tsx` / `XDialog.tsx` components, register the dialog in `DialogHost`, add the route under `(dashboard)/` and link it in `Sidebar`.

## Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Component files | PascalCase `.tsx`, one exported component per file | `InvoicesTable.tsx` |
| Components | Named exports (`export function X`) — **no default exports** | `export function Panel` |
| Route pages/layouts | `page.tsx` / `layout.tsx` with a default export | `export default function InvoicesPage` |
| Route folders | lowercase, kebab-case if multi-word | `transactions/` |
| lib modules | lowercase, kebab-case | `finance-context.tsx`, `rate-limit.ts` |
| Table / list components | plural noun + `Table` | `CustomersTable` |
| Dialog components | singular noun + `Dialog` (`Txn` for transactions) | `TxnDialog`, `BudgetDialog` |
| Server actions | `saveXAction`, `deleteXAction` (verb + entity + `Action`) | `saveInvoiceAction` |
| Data loaders | `getX` (plural) | `getInvoices` |
| Validators | `parseX` | `parseInvoice` |
| Types | PascalCase interfaces; form types `XFormValues`, submit payloads `XSubmitValues` | `InvoiceFormValues` |
| Constants | SCREAMING_SNAKE_CASE | `TODAY`, `ACCENT_RAMP`, `STATUS_CLASSES` |
| Shared class strings | camelCase + `Class` suffix, exported from the owning component | `inputClass`, `saveButtonClass` |
| DB tables / columns | plural snake_case tables and snake_case columns; camelCase in TS | `issue_date` ↔ `issueDate` |
| Dates | `YYYY-MM-DD` strings throughout, never `Date` objects in state | `"2026-09-15"` |
| References | Always link to another record by id with a real foreign key, never by name. Look names up for display in `useDashboardData` | `categoryId` / `category_id` |

## Code style

- Import from `src/` with the `@/` alias across folders (`@/lib/…`, `@/components/…`). Use relative `./` imports inside the same folder.
- Put `"use client"` only on components that need hooks or events. Presentational components such as `Panel` stay server-compatible.
- Server-only modules start with `import "server-only";`. Never import `supabase.ts`, `data.ts`, or `validate.ts` from client code.
- Use `import type` for type-only imports.
- Keep comments rare and use them to explain *why*, like the existing ones (e.g. the category-rename comment in `actions.ts`).
- Put pure logic in `format.ts` / `calculations.ts`, not in components.
- Use `fmtMoney` / `fmtDate` for every displayed amount and date. Never format by hand.

## Styling

- Use Tailwind utility classes and never `style={{…}}`. Do not add CSS modules or a component library without asking. Read the `tailwind-css` skill in `.claude/skills/` before styling work.
- Use theme tokens from `globals.css`: `bg-canvas`, `bg-surface`, `text-ink` (faded `text-ink/60`), `border-line` / `border-line-soft`, `accent-50…800` (`accent-500` = `#7f8051`, olive), `graphite`, `muted`, `mist`, `text-error`. Font sizes are px-named (`text-13`) and the default `text-sm`/`text-lg` scale is removed.
- Fonts: `font-sans` (Barlow) for body text and `font-condensed` (Barlow Condensed) for headings, titles and buttons.
- Derived display data returns full class strings (`amountClass`, `statusClass`), never hex values, and never builds class names from fragments. Join classes with `cx()` from `@/lib/cx`.
- Build panels from `Panel` + `CornerBrackets` (both take `className`). Dialogs should reuse the class exports from `DialogOverlay.tsx`.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS, so it must never reach the client and must never get a `NEXT_PUBLIC_` prefix.
- RLS stays **enabled with no policies** on every table.
- Every server action checks the session and validates its input, with no exceptions.
- Security headers live in `next.config.ts`. Keep `frame-ancestors 'none'` / `X-Frame-Options: DENY`.
- Use the `owasp-security` skill in `.claude/skills/` for security reviews.

## Environment

Set these in `.env.local` (gitignored via `.env*`):

| Variable | Purpose |
| --- | --- |
| `ADMIN_EMAIL` | the only allowed login email |
| `NEXT_PUBLIC_ADMIN_EMAIL` | optional client-side copy of the allowed login email |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for browser and server auth helpers |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public Supabase anon key for browser auth helpers |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key for server auth helpers |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only service role key |

## Gotchas

- `TODAY` in `lib/mock-data.ts` is **fixed** (`2026-09-15`) so the date-range math matches the seed data. Use it instead of `new Date()` for "today" defaults.
- `customerId` is optional on invoices and income transactions, and always `null` on expenses. Deleting a customer unlinks those records (`on delete set null`) instead of deleting them. On orders `customerId` is **required**, so deleting a customer who has orders fails at the DB. `deleteCustomer` checks first and shows an alert.
- A transaction's `type` must match its category's type (and its channel's, when set). The composite FKs `(category_id, type) → categories (id, type)` and `(channel_id, type) → channels (id, type)` enforce this.
- `channelId` is optional on every transaction. Deleting a channel unlinks its transactions (`on delete set null (channel_id)`) instead of failing like a category.
- `sourceId` (where an expense's money came from) is optional and only valid on expenses: `sources.type` is pinned to `'expense'` and the composite FK `(source_id, type) → sources (id, type)` rejects it on income. Deleting a source unlinks its expenses (`on delete set null (source_id)`).
- A product row is one variant: `(name, color, type)` is unique, and price and quantity belong to that variant. `type` is `lined` or `blank`.
- Deleting a category that is still in use fails at the DB. The client checks first and shows an alert (`deleteCategory`).
- An order and its `order_items` are saved together by the `save_order(p_order, p_items, p_payment)` Postgres function (an RPC), so the write is atomic. It replaces every item on each save. `orders.sub_total` is the sum of the item sub-totals, and `total_price` and `payment_status` are generated columns, so never write them directly. `orderTotals()` in `calculations.ts` does the same math on the client. The DB assigns `order_number` (`ORD-0001`…) from a sequence on first insert, and a trigger keeps it from changing. `save_order` returns the number, and `saveOrderAction` passes it back to the client.
- Order payments are income transactions with `transactions.order_id` set, and only income rows may have one. `orders.amount_paid` is **never written directly**. A trigger on `transactions` keeps it equal to the sum of the order's payments, so editing or deleting a payment on the Transactions page changes the order. `syncOrderPayments()` mirrors this in client state. A new order's first payment goes through `save_order`'s `p_payment`, and later ones go through `add_order_payment` (`recordOrderPaymentAction`, the Record payment dialog). The payment description comes from `add_order_payment` in SQL and from `orderPaymentDescription()` on the client, so keep the two in sync. Deleting an order keeps its payments as unlinked income.
- `deliveryProviderId` and `paymentMethodId` are optional on orders. Both are columns on `orders`, written by `save_order`, so a new order column means updating `save_order` in `schema.sql` and in a migration. Deleting a provider or method unlinks its orders (`on delete set null`) instead of failing.
- An item's `sub_total` is stored, not recomputed from the product's current price. The dialog fills it in as price × quantity, and it can still be overridden for a discount. Deleting a product that is on an order fails at the DB, so `deleteProduct` checks first.
- Optimistic writes (deletes, mark invoice paid, order status steps) don't roll back when they fail. A failed action only logs to the console.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
