# Tasks

## 1. Partial order + linked request — in progress

An order whose items are partly in stock becomes an order (stocked items) plus a
linked request (the shortfall, made to order). Converting the request merges its
items into the parent order.

### Decisions

**Data model**
- `orders.parent_order_id` (nullable FK → `orders`). Only a `requested` order can
  have one, and only a `processing` order can be a parent. Linking happens only on
  create, and a request is never unlinked (delete and recreate instead).
- A parent can have several open linked requests.
- `order_items` unique becomes `(order_id, variant_id, stock_tracked)`, so a merged
  made-to-order line sits next to the stocked line for the same variant.
- `order_items.from_request_number` + `order_items.requested_date` record where a
  merged line came from.
- `save_order` keeps `stock_tracked` per item (it used one `bool_and` for the whole order).
- A linked request stores `delivery_charge = 0`.
- Combined advance: the parent editor's one advance field is capped at the parent's
  items + its open linked requests' items + delivery charge, minus later payments.
  `save_order` re-splits it on every save (`split_order_advance`). The parent is
  filled up to its own total first, then each open linked request in creation
  order, as its own `is_advance` payment ("Advance for ORD-0013 (with ORD-0012)").
  The share copies the parent advance's date, category and channel. A share of 0
  deletes that advance. Record payment stays capped at the parent's own total. The
  picker form shows the combined advance and the request's share, read-only. A
  share edited on the Transactions page is overwritten by the next parent save.

**Ways in**
1. Single form: the order editor shows each line's stock. A quantity over stock
   moves the shortfall into a "To make" section automatically. One RPC saves the
   order (with the advance) and its linked request atomically. Works in new and
   edit mode for `processing` orders.
2. Request form with a "Parent order" picker: a shadcn combobox (popover + command)
   searching `processing` orders on the server (number / customer, paged). Picking
   one fills customer, dates, delivery fields (charge shown, stored as 0) and the
   advance, all disabled. Only the products can be edited.

**Lifecycle**
- While a parent has an open linked request, every status step on it is blocked
  ("Waiting on request ORD-xxxx"). Unblock by merging or deleting the request.
- Merge: a one-click "Merge into ORD-xxxx" row action with a confirm prompt →
  `merge_request(p_request_id)` moves the items (untracked, badged "Made to order")
  and deletes the request.
- Deleting a linked request touches no stock. Its advance share stays as unlinked income.
- Cancelling a parent cancels its open linked requests (the confirm prompt lists them).
- The parent's items and details stay editable while linked.
- Tables: the Requests tab gets a Parent order column; parent rows on the Orders tab
  get an "N pending request" badge.

### Steps
- [x] Migration `020_linked_requests.sql` + `schema.sql`: column, constraints, triggers,
      `save_order`, `merge_request`, `cancel_order` cascade, `list_orders`, `search_parent_orders`
- [x] Models, validators, actions, queries
- [x] Combobox primitive: `popover` added, `command` written by hand
- [ ] Install `cmdk` (blocked: npm registry login fails with E401)
- [x] Order editor: stock-aware split + parent-order picker
- [x] Tables: parent column, pending badge, merge action, blocked status steps
- [x] `npm run lint`, `tsc` (clean apart from the missing `cmdk`)
- [x] Combined advance across the order and its linked requests (`split_order_advance`)
- [ ] `npm run build` once `cmdk` is installed
- [ ] Run migration 020 on the database and test by hand: split order, picker,
      merge, blocked status step, cancel/delete parent, combined advance (new,
      edit with the parent's items lowered, picker-made request, merge)
