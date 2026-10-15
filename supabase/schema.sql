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

-- Server-side aggregates and list paging (also migrations/013_server_aggregates.sql).

create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_order_id_idx on transactions (order_id);
create index if not exists transactions_category_id_idx on transactions (category_id);
create index if not exists transactions_channel_id_idx on transactions (channel_id);
create index if not exists transactions_source_id_idx on transactions (source_id);
create index if not exists transactions_customer_id_idx on transactions (customer_id);
create index if not exists invoices_issue_date_idx on invoices (issue_date);
create index if not exists orders_order_date_idx on orders (order_date);
create index if not exists orders_customer_id_idx on orders (customer_id);
create index if not exists order_items_variant_id_idx on order_items (variant_id);

-- Every transaction with the amount the reports count. A delivery charge
-- collected for an outside provider isn't income, so it comes off the order's
-- earliest payments first. Self delivery keeps its charge. A correlated
-- subquery rather than a window, so date filters still use the index.
-- security_invoker keeps RLS in force for anyone but the service role.
create or replace view report_transactions with (security_invoker = true) as
select
  t.id,
  t.date,
  t.type,
  t.category_id,
  t.channel_id,
  t.source_id,
  t.customer_id,
  t.order_id,
  t.amount,
  t.amount - coalesce((
    select least(t.amount, greatest(0, o.delivery_charge - coalesce((
      select sum(p.amount)
      from transactions p
      where p.order_id = t.order_id
        and (p.date < t.date or (p.date = t.date and p.id < t.id))
    ), 0)))
    from orders o
    left join delivery_providers dp on dp.id = o.delivery_provider_id
    where o.id = t.order_id
      and o.delivery_charge > 0
      and lower(btrim(coalesce(dp.name, ''))) <> 'self delivery'
  ), 0) as report_amount
from transactions t;

-- Overview: totals for the range and the prior one, cash flow per day or
-- month, the top expense categories and the latest transactions.
create or replace function overview_summary(
  p_start date, p_end date, p_prev_start date, p_prev_end date, p_monthly boolean
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_start and p_end), 0),
    'expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_start and p_end), 0),
    'prev_income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_prev_start and p_prev_end), 0),
    'prev_expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_prev_start and p_prev_end), 0),
    'cash_flow', coalesce((
      select jsonb_agg(jsonb_build_object('key', b.key, 'income', b.income, 'expense', b.expense) order by b.key)
      from (
        select
          to_char(r.date, case when p_monthly then 'YYYY-MM' else 'YYYY-MM-DD' end) as key,
          coalesce(sum(r.report_amount) filter (where r.type = 'income'), 0) as income,
          coalesce(sum(r.report_amount) filter (where r.type = 'expense'), 0) as expense
        from report_transactions r
        where r.date between p_start and p_end
        group by 1
      ) b
    ), '[]'::jsonb),
    'expense_categories', coalesce((
      select jsonb_agg(jsonb_build_object('category_id', x.category_id, 'name', x.name, 'amount', x.amount) order by x.amount desc, x.name)
      from (
        select t.category_id, c.name, sum(t.amount) as amount
        from transactions t
        join categories c on c.id = t.category_id
        where t.type = 'expense' and t.date between p_start and p_end
        group by t.category_id, c.name
        order by amount desc, c.name
        limit 6
      ) x
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'date', x.date, 'type', x.type, 'description', x.description, 'amount', x.amount)
        order by x.date desc, x.id desc)
      from (
        select t.id, t.date, t.type, t.description, t.amount
        from transactions t
        where t.date between p_start and p_end
        order by t.date desc, t.id desc
        limit 6
      ) x
    ), '[]'::jsonb)
  )
$$;

-- One page of transactions with the names they link to, plus the match count.
-- p_type / p_category_id are null for "all". Unknown sort keys fall back to newest first.
create or replace function list_transactions(
  p_start date, p_end date, p_type text, p_category_id text,
  p_sort text, p_desc boolean, p_limit integer, p_offset integer
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select
      t.id, t.date, t.type, t.category_id, t.description, t.amount,
      t.channel_id, t.source_id, t.customer_id, t.order_id,
      c.name as category_name, ch.name as channel_name, cu.name as customer_name,
      s.name as source_name, o.order_number
    from transactions t
    join categories c on c.id = t.category_id
    left join channels ch on ch.id = t.channel_id
    left join customers cu on cu.id = t.customer_id
    left join sources s on s.id = t.source_id
    left join orders o on o.id = t.order_id
    where t.date between p_start and p_end
      and (p_type is null or t.type = p_type)
      and (p_category_id is null or t.category_id = p_category_id)
  ),
  ranked as (
    select f.*, row_number() over (order by
      case when not p_desc then case p_sort when 'description' then f.description when 'category' then f.category_name when 'channel' then f.channel_name end end asc nulls last,
      case when p_desc then case p_sort when 'description' then f.description when 'category' then f.category_name when 'channel' then f.channel_name end end desc nulls last,
      case when p_sort = 'amount' and not p_desc then f.amount end asc,
      case when p_sort = 'amount' and p_desc then f.amount end desc,
      case when p_sort = 'date' and not p_desc then f.date end asc,
      f.date desc, f.id desc
    ) as rn
    from f
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'income', coalesce((select sum(f.amount) from f where f.type = 'income'), 0),
    'expense', coalesce((select sum(f.amount) from f where f.type = 'expense'), 0),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) - 'rn' order by r.rn)
      from ranked r
      where r.rn > p_offset and r.rn <= p_offset + p_limit
    ), '[]'::jsonb)
  )
$$;

-- One page of invoices issued in the range, with the range's totals.
create or replace function list_invoices(
  p_start date, p_end date, p_today date,
  p_sort text, p_desc boolean, p_limit integer, p_offset integer
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select
      i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.paid,
      cu.name as customer_name,
      case when i.paid then 'Paid' when i.due_date < p_today then 'Overdue' else 'Outstanding' end as status
    from invoices i
    left join customers cu on cu.id = i.customer_id
    where i.issue_date between p_start and p_end
  ),
  ranked as (
    select f.*, row_number() over (order by
      case when not p_desc then case p_sort when 'client' then f.customer_name when 'status' then f.status end end asc nulls last,
      case when p_desc then case p_sort when 'client' then f.customer_name when 'status' then f.status end end desc nulls last,
      case when not p_desc then case p_sort when 'issueDate' then f.issue_date when 'dueDate' then f.due_date end end asc,
      case when p_desc then case p_sort when 'issueDate' then f.issue_date when 'dueDate' then f.due_date end end desc,
      case when p_sort = 'amount' and not p_desc then f.amount end asc,
      case when p_sort = 'amount' and p_desc then f.amount end desc,
      f.issue_date desc, f.id desc
    ) as rn
    from f
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'outstanding', coalesce((select sum(f.amount) from f where not f.paid), 0),
    'overdue_count', (select count(*) from f where f.status = 'Overdue'),
    'paid', coalesce((select sum(f.amount) from f where f.paid), 0),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) - 'rn' order by r.rn)
      from ranked r
      where r.rn > p_offset and r.rn <= p_offset + p_limit
    ), '[]'::jsonb)
  )
$$;

-- One page of orders placed in the range, with their items, payment count and
-- last payment (the Record payment dialog's defaults), plus the range's totals.
create or replace function list_orders(
  p_start date, p_end date,
  p_search text,
  p_order_status text,
  p_payment_status text,
  p_sort text, p_desc boolean, p_limit integer, p_offset integer
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select
      o.id, o.order_number, o.customer_id, o.order_date, o.order_status, o.sub_total,
      o.delivery_charge, o.delivery_location, o.delivery_provider_id, o.payment_method_id,
      o.total_price, o.amount_paid, o.payment_status,
      cu.name as customer_name, dp.name as delivery_provider_name, pm.name as payment_method_name
    from orders o
    join customers cu on cu.id = o.customer_id
    left join delivery_providers dp on dp.id = o.delivery_provider_id
    left join payment_methods pm on pm.id = o.payment_method_id
    where o.order_date between p_start and p_end
      and (p_order_status is null or o.order_status::text = p_order_status)
      and (p_payment_status is null or o.payment_status::text = p_payment_status)
      and (
        nullif(trim(p_search), '') is null
        or o.order_number ilike '%' || trim(p_search) || '%'
        or cu.name ilike '%' || trim(p_search) || '%'
        or coalesce(cu.phone, '') ilike '%' || trim(p_search) || '%'
        or replace(o.order_status::text, '_', ' ') ilike '%' || replace(trim(p_search), '_', ' ') || '%'
        or exists (
          select 1
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          join products pr on pr.id = v.product_id
          where oi.order_id = o.id
            and pr.name ilike '%' || trim(p_search) || '%'
        )
      )
  ),
  ranked as (
    select f.*, row_number() over (order by
      case when p_sort = 'customer' and not p_desc then f.customer_name end asc,
      case when p_sort = 'customer' and p_desc then f.customer_name end desc,
      case when not p_desc then case p_sort when 'totalPrice' then f.total_price when 'amountPaid' then f.amount_paid end end asc,
      case when p_desc then case p_sort when 'totalPrice' then f.total_price when 'amountPaid' then f.amount_paid end end desc,
      case when p_sort = 'status' and not p_desc
        then array_position(array['processing', 'ready_for_delivery', 'out_for_delivery', 'delivered'], f.order_status) end asc,
      case when p_sort = 'status' and p_desc
        then array_position(array['processing', 'ready_for_delivery', 'out_for_delivery', 'delivered'], f.order_status) end desc,
      case when p_sort = 'orderDate' and not p_desc then f.order_date end asc,
      case when p_sort = 'orderDate' and not p_desc then f.order_number end asc,
      f.order_date desc, f.order_number desc
    ) as rn
    from f
  ),
  page as (
    select * from ranked r where r.rn > p_offset and r.rn <= p_offset + p_limit
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'revenue', coalesce((select sum(f.total_price) from f), 0),
    'balance_due', coalesce((select sum(f.total_price - f.amount_paid) from f), 0),
    'open_count', (select count(*) from f where f.order_status <> 'delivered'),
    'rows', coalesce((
      select jsonb_agg((to_jsonb(p) - 'rn') || jsonb_build_object(
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', oi.id, 'variant_id', oi.variant_id, 'quantity', oi.quantity, 'sub_total', oi.sub_total,
            'product_name', pr.name, 'option_names', to_jsonb(pr.option_names), 'options', v.options
          ) order by pr.name, oi.id)
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          join products pr on pr.id = v.product_id
          where oi.order_id = p.id
        ), '[]'::jsonb),
        'payment_count', (select count(*) from transactions t where t.order_id = p.id),
        'last_payment', (
          select jsonb_build_object('category_id', t.category_id, 'channel_id', t.channel_id)
          from transactions t
          where t.order_id = p.id
          order by t.date desc, t.id desc
          limit 1
        )
      ) order by p.rn)
      from page p
    ), '[]'::jsonb)
  )
$$;

-- Each budget with what its category spent in the range.
create or replace function budget_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'category_id', b.category_id,
    'category_name', c.name,
    'target', b.target,
    'actual', coalesce((select sum(t.amount) from transactions t
      where t.category_id = b.category_id and t.date between p_start and p_end), 0)
  ) order by c.name), '[]'::jsonb)
  from budgets b
  join categories c on c.id = b.category_id
$$;

-- Each customer's income in the range and overall, plus all income in the
-- range so the page can show what isn't linked to anyone.
create or replace function customer_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_start and p_end), 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'company', c.company, 'email', c.email, 'phone', c.phone,
        'in_range', coalesce(s.in_range, 0),
        'lifetime', coalesce(s.lifetime, 0),
        'payment_count', coalesce(s.payment_count, 0),
        'last_date', s.last_date,
        'order_count', (select count(*) from orders o where o.customer_id = c.id)
      ) order by c.name)
      from customers c
      left join (
        select
          r.customer_id,
          sum(r.report_amount) filter (where r.date between p_start and p_end) as in_range,
          sum(r.report_amount) as lifetime,
          count(*) as payment_count,
          max(r.date) as last_date
        from report_transactions r
        where r.type = 'income' and r.customer_id is not null
        group by r.customer_id
      ) s on s.customer_id = c.id
    ), '[]'::jsonb)
  )
$$;

create or replace function category_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.type,
    'txn_count', (select count(*) from transactions t where t.category_id = c.id),
    'budgeted', exists (select 1 from budgets b where b.category_id = c.id)
  ) order by c.name), '[]'::jsonb)
  from categories c
$$;

create or replace function channel_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ch.id,
    'name', ch.name,
    'type', ch.type,
    'txn_count', (select count(*) from transactions t where t.channel_id = ch.id)
  ) order by ch.name), '[]'::jsonb)
  from channels ch
$$;

create or replace function source_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_start and p_end), 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'expense_count', (select count(*) from transactions t where t.source_id = s.id),
        'in_range', coalesce((select sum(t.amount) from transactions t
          where t.source_id = s.id and t.date between p_start and p_end), 0)
      ) order by s.name)
      from sources s
    ), '[]'::jsonb)
  )
$$;

create or replace function delivery_provider_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'orders_without_provider', (select count(*) from orders o
      where o.delivery_provider_id is null and o.order_date between p_start and p_end),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'order_count', (select count(*) from orders o where o.delivery_provider_id = d.id),
        'in_range', coalesce((select sum(o.delivery_charge) from orders o
          where o.delivery_provider_id = d.id and o.order_date between p_start and p_end), 0)
      ) order by d.name)
      from delivery_providers d
    ), '[]'::jsonb)
  )
$$;

create or replace function payment_method_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'orders_without_method', (select count(*) from orders o
      where o.payment_method_id is null and o.order_date between p_start and p_end),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'order_count', (select count(*) from orders o where o.payment_method_id = m.id),
        'in_range', coalesce((select sum(o.total_price) from orders o
          where o.payment_method_id = m.id and o.order_date between p_start and p_end), 0)
      ) order by m.name)
      from payment_methods m
    ), '[]'::jsonb)
  )
$$;

-- Stock totals across every variant, and per product with how many orders use it.
create or replace function product_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'units', coalesce((select sum(v.quantity) from product_variants v), 0),
    'stock_value', coalesce((select sum(v.quantity * v.price) from product_variants v), 0),
    'out_of_stock', (select count(*) from product_variants v where v.quantity = 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'option_names', to_jsonb(p.option_names),
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object('id', v.id, 'options', v.options, 'quantity', v.quantity, 'price', v.price))
          from product_variants v where v.product_id = p.id
        ), '[]'::jsonb),
        'units', coalesce((select sum(v.quantity) from product_variants v where v.product_id = p.id), 0),
        'stock_value', coalesce((select sum(v.quantity * v.price) from product_variants v where v.product_id = p.id), 0),
        'order_count', (
          select count(distinct oi.order_id)
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          where v.product_id = p.id
        )
      ) order by p.name)
      from products p
    ), '[]'::jsonb)
  )
$$;

-- A product's variants that are on an order, which save_product can't remove.
create or replace function variants_in_use(p_product_id text) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(distinct oi.variant_id), '[]'::jsonb)
  from order_items oi
  join product_variants v on v.id = oi.variant_id
  where v.product_id = p_product_id
$$;

-- Only the server (service role) may read these.
revoke all on report_transactions from public, anon, authenticated;
grant select on report_transactions to service_role;

revoke execute on function overview_summary(date, date, date, date, boolean) from public, anon, authenticated;
revoke execute on function list_transactions(date, date, text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function list_invoices(date, date, date, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function list_orders(date, date, text, text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function budget_summary(date, date) from public, anon, authenticated;
revoke execute on function customer_summary(date, date) from public, anon, authenticated;
revoke execute on function category_summary() from public, anon, authenticated;
revoke execute on function channel_summary() from public, anon, authenticated;
revoke execute on function source_summary(date, date) from public, anon, authenticated;
revoke execute on function delivery_provider_summary(date, date) from public, anon, authenticated;
revoke execute on function payment_method_summary(date, date) from public, anon, authenticated;
revoke execute on function product_summary() from public, anon, authenticated;
revoke execute on function variants_in_use(text) from public, anon, authenticated;
grant execute on function overview_summary(date, date, date, date, boolean) to service_role;
grant execute on function list_transactions(date, date, text, text, text, boolean, integer, integer) to service_role;
grant execute on function list_invoices(date, date, date, text, boolean, integer, integer) to service_role;
grant execute on function list_orders(date, date, text, text, text, text, boolean, integer, integer) to service_role;
grant execute on function budget_summary(date, date) to service_role;
grant execute on function customer_summary(date, date) to service_role;
grant execute on function category_summary() to service_role;
grant execute on function channel_summary() to service_role;
grant execute on function source_summary(date, date) to service_role;
grant execute on function delivery_provider_summary(date, date) to service_role;
grant execute on function payment_method_summary(date, date) to service_role;
grant execute on function product_summary() to service_role;
grant execute on function variants_in_use(text) to service_role;
