-- Adds orders and their line items. Run once in the Supabase SQL editor,
-- before deploying the matching app code.

begin;

-- Order numbers come from the DB so they're unique and sequential no matter
-- who saves. lpad would truncate past 9999, hence the greatest().
create sequence if not exists order_number_seq;

create or replace function next_order_number() returns text
language sql
set search_path = public
as $$
  select 'ORD-' || lpad(n::text, greatest(4, length(n::text)), '0')
  from (select nextval('order_number_seq') as n) s
$$;

create table if not exists orders (
  id text primary key,
  order_number text not null unique default next_order_number(),
  -- No on-delete action: a customer with orders can't be deleted.
  customer_id text not null references customers(id),
  order_date date not null,
  order_status text not null default 'processing'
    check (order_status in ('processing', 'ready_for_delivery', 'out_for_delivery', 'delivered')),
  -- Kept equal to the sum of order_items.sub_total by save_order().
  sub_total numeric not null default 0 check (sub_total >= 0),
  delivery_charge numeric not null default 0 check (delivery_charge >= 0),
  total_price numeric generated always as (sub_total + delivery_charge) stored,
  amount_paid numeric not null default 0 check (amount_paid >= 0 and amount_paid <= sub_total + delivery_charge),
  -- Derived so it can never disagree with amount_paid.
  payment_status text generated always as (
    case when amount_paid >= sub_total + delivery_charge then 'paid' else 'partially_paid' end
  ) stored
);

-- Once assigned, an order number never changes.
create or replace function keep_order_number() returns trigger
language plpgsql
as $$
begin
  new.order_number := old.order_number;
  return new;
end;
$$;

drop trigger if exists orders_keep_order_number on orders;
create trigger orders_keep_order_number
  before update on orders
  for each row execute function keep_order_number();

-- sub_total is stored per line rather than derived from the product's current
-- price, so later price changes (or a discount on one line) don't rewrite old orders.
create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null references products(id),
  quantity integer not null check (quantity > 0),
  sub_total numeric not null check (sub_total >= 0),
  unique (order_id, product_id)
);

alter table orders enable row level security;
alter table order_items enable row level security;

-- Writes an order and replaces its items in one transaction, so a failed item
-- insert can't leave an order whose sub_total doesn't match its lines. Returns
-- the order number, which the DB assigns on first save.
-- Update-then-insert rather than `on conflict`, which would evaluate the
-- order_number default (and burn a sequence value) on every edit.
create or replace function save_order(p_order jsonb, p_items jsonb) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_order->>'id';
  v_sub_total numeric := (select coalesce(sum((x->>'sub_total')::numeric), 0) from jsonb_array_elements(p_items) x);
  v_order_number text;
begin
  update orders set
    customer_id = p_order->>'customer_id',
    order_date = (p_order->>'order_date')::date,
    order_status = p_order->>'order_status',
    sub_total = v_sub_total,
    delivery_charge = (p_order->>'delivery_charge')::numeric,
    amount_paid = (p_order->>'amount_paid')::numeric
  where id = v_id
  returning order_number into v_order_number;

  if not found then
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, amount_paid)
    values (
      v_id,
      p_order->>'customer_id',
      (p_order->>'order_date')::date,
      p_order->>'order_status',
      v_sub_total,
      (p_order->>'delivery_charge')::numeric,
      (p_order->>'amount_paid')::numeric
    )
    returning order_number into v_order_number;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, product_id, quantity, sub_total)
  select x->>'id', v_id, x->>'product_id', (x->>'quantity')::integer, (x->>'sub_total')::numeric
  from jsonb_array_elements(p_items) x;

  return v_order_number;
end;
$$;

-- Only the server (service role) may call these.
revoke execute on function next_order_number() from public, anon, authenticated;
revoke execute on function save_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function next_order_number() to service_role;
grant execute on function save_order(jsonb, jsonb) to service_role;

commit;
