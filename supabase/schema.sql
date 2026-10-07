-- Run this in the Supabase SQL editor for your project.
-- The app talks to these tables exclusively from the server using the
-- service role key (see src/lib/supabase.ts), so RLS stays enabled with
-- no policies: the service role bypasses it, everyone else is denied.

-- Every relationship is by id. Databases created before that (when rows
-- stored category/client names) are converted by migrations/001_link_by_id.sql.
create table if not exists categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  unique (type, name),
  -- Target of the composite FK on transactions, so a transaction's type
  -- always matches its category's.
  unique (id, type)
);

insert into categories (name, type) values
  ('Etsy Sales', 'income'),
  ('Website Sales', 'income'),
  ('Wholesale Orders', 'income'),
  ('Craft Fair Sales', 'income'),
  ('Custom Commissions', 'income'),
  ('Order Sales', 'income'),
  ('Leather & Materials', 'expense'),
  ('Paper Stock', 'expense'),
  ('Packaging & Supplies', 'expense'),
  ('Shipping Postage', 'expense'),
  ('Platform & Payment Fees', 'expense'),
  ('Marketing & Ads', 'expense'),
  ('Studio Rent', 'expense'),
  ('Equipment & Tools', 'expense'),
  ('Contract Labor', 'expense'),
  ('Software & Subscriptions', 'expense')
on conflict (type, name) do nothing;

-- Where income comes from (Etsy, Shopify…) or who an expense was paid to
-- (USPS, Uline…). Typed like categories, for the same composite FK.
create table if not exists channels (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  unique (type, name),
  unique (id, type)
);

insert into channels (name, type) values
  ('Etsy', 'income'),
  ('Shopify', 'income'),
  ('Wholesale', 'income'),
  ('Craft Fair', 'income'),
  ('Custom', 'income'),
  ('Tandy Leather', 'expense'),
  ('Legion Paper', 'expense'),
  ('USPS', 'expense'),
  ('Meta Ads', 'expense'),
  ('Uline', 'expense')
on conflict (type, name) do nothing;

create table if not exists sources (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  type text not null default 'expense' check (type = 'expense'),
  unique (id, type)
);

create table if not exists customers (
  id text primary key,
  name text not null,
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default ''
);

create table if not exists transactions (
  id text primary key,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category_id text not null,
  description text not null,
  amount numeric not null,
  channel_id text,
  source_id text,
  customer_id text references customers(id) on delete set null,
  foreign key (category_id, type) references categories (id, type),
  -- Clear only channel_id: nulling type as well would break its not null.
  foreign key (channel_id, type) references channels (id, type) on delete set null (channel_id),
  foreign key (source_id, type) references sources (id, type) on delete set null (source_id)
);
-- Budgets only make sense for expense categories; saveBudgetAction checks that.
create table if not exists budgets (
  id text primary key,
  category_id text not null unique references categories(id),
  target numeric not null
);

create table if not exists invoices (
  id text primary key,
  customer_id text references customers(id) on delete set null,
  issue_date date not null,
  due_date date not null,
  amount numeric not null,
  paid boolean not null default false
);

create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  -- Ordered names of the options each variant sets, e.g. {Color,Type}.
  option_names text[] not null default '{}'
);
create unique index if not exists products_name_key on products (lower(btrim(name)));

-- One row per sellable variant: each option combination carries its own stock and price.
create table if not exists product_variants (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references products(id) on delete cascade,
  -- One value per option name, e.g. {"Color": "Olive", "Type": "Lined"}.
  options jsonb not null default '{}',
  quantity integer not null default 0 check (quantity >= 0),
  price numeric not null check (price >= 0),
  unique (product_id, options)
);
create index if not exists product_variants_product_id_idx on product_variants (product_id);

-- Who carries an order to the customer (a courier, self pickup…).
create table if not exists delivery_providers (
  id text primary key default gen_random_uuid()::text,
  name text not null unique
);

-- How the customer pays for an order (cash, eSewa, bank transfer…).
create table if not exists payment_methods (
  id text primary key default gen_random_uuid()::text,
  name text not null unique
);

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
  delivery_location text,
  -- Both optional: deleting a provider or method unlinks its orders.
  delivery_provider_id text references delivery_providers(id) on delete set null,
  payment_method_id text references payment_methods(id) on delete set null,
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
  variant_id text not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  sub_total numeric not null check (sub_total >= 0),
  -- False for items saved before stock tracking began: their orders never touch stock.
  stock_tracked boolean not null default true,
  unique (order_id, variant_id)
);

-- save_order replaces an order's items on every save, so the delete restores
-- the old quantities and the insert deducts the new ones.
create or replace function apply_order_item_stock() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.stock_tracked then
    update product_variants set quantity = quantity - new.quantity where id = new.variant_id;
  elsif tg_op = 'DELETE' and old.stock_tracked then
    update product_variants set quantity = quantity + old.quantity where id = old.variant_id;
  end if;
  return null;
end;
$$;

drop trigger if exists order_items_apply_stock on order_items;
create trigger order_items_apply_stock
  after insert or delete on order_items
  for each row execute function apply_order_item_stock();

-- An order's payments are income transactions linked by order_id. Added here
-- rather than in create table transactions, which runs before orders exists.
-- Deleting an order keeps its payments as plain income: the money was still received.
alter table transactions add column if not exists order_id text references orders(id) on delete set null;
alter table transactions drop constraint if exists transactions_order_income_check;
alter table transactions add constraint transactions_order_income_check check (order_id is null or type = 'income');

alter table categories enable row level security;
alter table channels enable row level security;
alter table customers enable row level security;
alter table sources enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table invoices enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table delivery_providers enable row level security;
alter table payment_methods enable row level security;

-- Keeps orders.amount_paid equal to the sum of the order's payments. The
-- amount_paid <= total check on orders rejects any payment that overpays.
create or replace function sync_order_amount_paid() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ids text[] := '{}';
begin
  if tg_op in ('UPDATE', 'DELETE') then v_ids := v_ids || old.order_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_ids := v_ids || new.order_id; end if;
  update orders o
  set amount_paid = coalesce((select sum(t.amount) from transactions t where t.order_id = o.id), 0)
  where o.id = any(v_ids);
  return null;
end;
$$;

drop trigger if exists transactions_sync_order_amount_paid on transactions;
create trigger transactions_sync_order_amount_paid
  after insert or delete or update of amount, order_id on transactions
  for each row execute function sync_order_amount_paid();

-- Adds one payment to an order as an income transaction. The description and
-- customer come from the order; the app builds the same description
-- (orderPaymentDescription in src/lib/format.ts).
create or replace function add_order_payment(p_order_id text, p_payment jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into transactions (id, date, type, category_id, description, amount, channel_id, customer_id, order_id)
  select
    p_payment->>'id',
    (p_payment->>'date')::date,
    'income',
    p_payment->>'category_id',
    'Payment for ' || o.order_number,
    (p_payment->>'amount')::numeric,
    p_payment->>'channel_id',
    o.customer_id,
    o.id
  from orders o
  where o.id = p_order_id;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;
end;
$$;

-- Writes an order and replaces its items in one transaction, so a failed item
-- insert can't leave an order whose sub_total doesn't match its lines. Returns
-- the order number, which the DB assigns on first save. p_payment, when given,
-- is recorded as the order's first payment. amount_paid isn't written here: the
-- trigger above keeps it equal to the order's payments.
-- Update-then-insert rather than `on conflict`, which would evaluate the
-- order_number default (and burn a sequence value) on every edit.
create or replace function save_order(p_order jsonb, p_items jsonb, p_payment jsonb default null) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_order->>'id';
  v_sub_total numeric := (select coalesce(sum((x->>'sub_total')::numeric), 0) from jsonb_array_elements(p_items) x);
  -- Read before the items are replaced: an order that predates stock tracking stays untracked.
  v_tracked boolean := coalesce((select bool_and(stock_tracked) from order_items where order_id = p_order->>'id'), true);
  v_order_number text;
begin
  update orders set
    customer_id = p_order->>'customer_id',
    order_date = (p_order->>'order_date')::date,
    order_status = p_order->>'order_status',
    sub_total = v_sub_total,
    delivery_charge = (p_order->>'delivery_charge')::numeric,
    delivery_location = p_order->>'delivery_location',
    delivery_provider_id = p_order->>'delivery_provider_id',
    payment_method_id = p_order->>'payment_method_id'
  where id = v_id
  returning order_number into v_order_number;

  if found then
    -- Payments follow the order's customer.
    update transactions set customer_id = p_order->>'customer_id' where order_id = v_id;
  else
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id)
    values (
      v_id,
      p_order->>'customer_id',
      (p_order->>'order_date')::date,
      p_order->>'order_status',
      v_sub_total,
      (p_order->>'delivery_charge')::numeric,
      p_order->>'delivery_location',
      p_order->>'delivery_provider_id',
      p_order->>'payment_method_id'
    )
    returning order_number into v_order_number;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, variant_id, quantity, sub_total, stock_tracked)
  select x->>'id', v_id, x->>'variant_id', (x->>'quantity')::integer, (x->>'sub_total')::numeric, v_tracked
  from jsonb_array_elements(p_items) x;

  if p_payment is not null then
    perform add_order_payment(v_id, p_payment);
  end if;

  return v_order_number;
end;
$$;

-- Writes a product and replaces its variant list in one transaction. Variants
-- missing from p_variants are deleted, which the order_items FK rejects while
-- an order still uses them.
create or replace function save_product(p_product jsonb, p_variants jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_product->>'id';
begin
  insert into products (id, name, option_names)
  values (
    v_id,
    p_product->>'name',
    array(select jsonb_array_elements_text(p_product->'option_names'))
  )
  on conflict (id) do update set name = excluded.name, option_names = excluded.option_names;

  delete from product_variants
  where product_id = v_id
    and id not in (select x->>'id' from jsonb_array_elements(p_variants) x);

  insert into product_variants (id, product_id, options, quantity, price)
  select x->>'id', v_id, x->'options', (x->>'quantity')::integer, (x->>'price')::numeric
  from jsonb_array_elements(p_variants) x
  on conflict (id) do update set
    options = excluded.options,
    quantity = excluded.quantity,
    price = excluded.price
  where product_variants.product_id = v_id;
end;
$$;

-- Only the server (service role) may call these.
revoke execute on function next_order_number() from public, anon, authenticated;
revoke execute on function add_order_payment(text, jsonb) from public, anon, authenticated;
revoke execute on function save_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function save_product(jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_product(jsonb, jsonb) to service_role;
grant execute on function next_order_number() to service_role;
grant execute on function add_order_payment(text, jsonb) to service_role;
grant execute on function save_order(jsonb, jsonb, jsonb) to service_role;
