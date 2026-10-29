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

-- What kind of product it is (Journal, Notebook…). Every product has one.
create table if not exists product_categories (
  id text primary key default gen_random_uuid()::text,
  name text not null
);
create unique index if not exists product_categories_name_key on product_categories (lower(btrim(name)));

insert into product_categories (name) values ('Journal')
on conflict do nothing;

create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category_id text not null references product_categories(id) on delete restrict,
  -- Ordered names of the options each variant sets, e.g. {Color,Type}.
  option_names text[] not null default '{}'
);
create unique index if not exists products_name_key on products (lower(btrim(name)));
create index if not exists products_category_id_idx on products (category_id);

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
  -- 'requested' is a made-to-order request, entered only on create and left by
  -- conversion (to processing) or cancelling. guard_order_status() enforces the moves.
  order_status text not null default 'processing'
    constraint orders_order_status_check
    check (order_status in ('requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled')),
  -- Set when the order is created as a request and kept after conversion.
  requested_date date,
  -- A linked request's order: the request holds the made-to-order shortfall and
  -- is merged into the order (merge_request). Never changes once set. Deleting
  -- the order deletes its linked requests; they hold no stock, and their advance
  -- shares stay as unlinked income.
  parent_order_id text references orders(id) on delete cascade,
  note text,
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
  ) stored,
  constraint orders_requested_date_check check (order_status <> 'requested' or requested_date is not null),
  constraint orders_parent_check check (parent_order_id is null or requested_date is not null)
);

create index if not exists orders_parent_order_id_idx on orders (parent_order_id) where parent_order_id is not null;

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

create or replace function guard_order_status() returns trigger
language plpgsql
as $$
declare
  v_waiting text;
begin
  -- A cancelled order is read-only. amount_paid (its payments) and the
  -- provider/method links (on delete set null) may still change.
  if old.order_status = 'cancelled' and (
    new.order_status, new.customer_id, new.order_date, new.sub_total, new.delivery_charge,
    new.delivery_location, new.note, new.requested_date
  ) is distinct from (
    old.order_status, old.customer_id, old.order_date, old.sub_total, old.delivery_charge,
    old.delivery_location, old.note, old.requested_date
  ) then
    raise exception 'Order % is cancelled and can no longer be changed', old.order_number;
  end if;
  if new.parent_order_id is distinct from old.parent_order_id then
    raise exception 'Request % can''t be linked to a different order', old.order_number;
  end if;
  if new.order_status is distinct from old.order_status then
    if new.order_status = 'requested' then
      raise exception 'Order % can''t go back to requested', old.order_number;
    end if;
    if old.order_status = 'requested' and new.order_status not in ('processing', 'cancelled') then
      raise exception 'Request % can only be converted to processing or cancelled', old.order_number;
    end if;
    if old.order_status = 'requested' and new.order_status = 'processing' and old.parent_order_id is not null then
      raise exception 'Request % is linked to an order. Merge it into that order instead', old.order_number;
    end if;
    if new.order_status = 'cancelled' and old.order_status not in ('requested', 'processing', 'ready_for_delivery') then
      raise exception 'Order % can no longer be cancelled', old.order_number;
    end if;
    if new.order_status <> 'cancelled' then
      select string_agg(c.order_number, ', ' order by c.order_number) into v_waiting
      from orders c
      where c.parent_order_id = old.id and c.order_status = 'requested';
      if v_waiting is not null then
        raise exception 'Order % is waiting on request %. Merge or delete it first', old.order_number, v_waiting;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_status on orders;
create trigger orders_guard_status
  before update on orders
  for each row execute function guard_order_status();

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
  -- Set on lines merged in from a linked request (merge_request).
  from_request_number text,
  requested_date date
);

-- A merged made-to-order line sits next to the stocked line for the same variant.
create unique index if not exists order_items_variant_per_source
  on order_items (order_id, variant_id, coalesce(from_request_number, ''));

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

-- An order's advance: the one payment the order editor creates and edits.
alter table transactions add column if not exists is_advance boolean not null default false;
alter table transactions drop constraint if exists transactions_advance_check;
alter table transactions add constraint transactions_advance_check check (not is_advance or order_id is not null);
create unique index if not exists transactions_one_advance_per_order on transactions (order_id) where is_advance;

-- A payment unlinked from its order (the order was deleted, or the row became
-- an expense) stops being an advance, so the check above holds.
create or replace function clear_unlinked_advance() returns trigger
language plpgsql
as $$
begin
  if new.order_id is null then
    new.is_advance := false;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_clear_unlinked_advance on transactions;
create trigger transactions_clear_unlinked_advance
  before insert or update on transactions
  for each row execute function clear_unlinked_advance();

alter table categories enable row level security;
alter table channels enable row level security;
alter table customers enable row level security;
alter table sources enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table invoices enable row level security;
alter table product_categories enable row level security;
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
-- customer come from the order. A request holds only its advance (see
-- save_order), and a cancelled order takes no payments.
create or replace function add_order_payment(p_order_id text, p_payment jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
begin
  select o.order_status into v_status from orders o where o.id = p_order_id;
  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;
  if v_status = 'requested' then
    raise exception 'A request holds one advance payment. Convert it to an order first.';
  end if;
  if v_status = 'cancelled' then
    raise exception 'A cancelled order can''t take payments';
  end if;

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
end;
$$;

-- Spreads an order's advance (p_payment: everything the customer paid up front)
-- over the order and its open linked requests: the order first, up to what its
-- total leaves after later payments, then each request in the order it was
-- made. A request's share copies the payment's date, category and channel, and
-- a share of 0 removes that record's advance.
create or replace function split_order_advance(p_order_id text, p_payment jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_left numeric := (p_payment->>'amount')::numeric;
  v_order_number text;
  v_target record;
  v_share numeric;
  v_advance_id text;
begin
  select o.order_number into v_order_number from orders o where o.id = p_order_id;
  for v_target in
    select
      o.id, o.order_number, o.customer_id, o.id = p_order_id as is_order,
      o.total_price - coalesce((select sum(t.amount) from transactions t where t.order_id = o.id and not t.is_advance), 0) as room
    from orders o
    where o.id = p_order_id or (o.parent_order_id = p_order_id and o.order_status = 'requested')
    order by o.id = p_order_id desc, length(o.order_number), o.order_number
  loop
    v_share := least(v_left, greatest(v_target.room, 0));
    v_left := v_left - v_share;
    select t.id into v_advance_id from transactions t where t.order_id = v_target.id and t.is_advance;
    if v_share <= 0 then
      delete from transactions where id = v_advance_id;
    elsif v_advance_id is null then
      insert into transactions (id, date, type, category_id, description, amount, channel_id, customer_id, order_id, is_advance)
      values (
        case when v_target.is_order then p_payment->>'id' else gen_random_uuid()::text end,
        (p_payment->>'date')::date,
        'income',
        p_payment->>'category_id',
        case when v_target.is_order
          then 'Advance for ' || v_order_number
          else 'Advance for ' || v_target.order_number || ' (with ' || v_order_number || ')' end,
        v_share,
        p_payment->>'channel_id',
        v_target.customer_id,
        v_target.id,
        true
      );
    else
      update transactions set
        date = (p_payment->>'date')::date,
        amount = v_share,
        category_id = p_payment->>'category_id',
        channel_id = p_payment->>'channel_id',
        customer_id = v_target.customer_id
      where id = v_advance_id;
    end if;
  end loop;
  if v_left > 0 then
    raise exception 'The advance is more than order % and its requests still owe', v_order_number;
  end if;
end;
$$;

-- Writes an order and replaces its items in one transaction, so a failed item
-- insert can't leave an order whose sub_total doesn't match its lines. Returns
-- the order number, which the DB assigns on first save. p_payment, when given,
-- is the whole advance, split over the order and its open linked requests by
-- split_order_advance; null leaves the advances as they are.
-- amount_paid isn't written here: the trigger above keeps it equal to the
-- order's payments. Items of a request (requested_date set) never touch stock,
-- and lines kept by id keep their own tracking. A linked request mirrors its
-- order (everything but its items), and p_request {id, items}, when given, is
-- the shortfall the editor split off, saved as a request linked to this order.
-- Update-then-insert rather than `on conflict`, which would evaluate the
-- order_number default (and burn a sequence value) on every edit.
drop function if exists save_order(jsonb, jsonb, jsonb);
create or replace function save_order(p_order jsonb, p_items jsonb, p_payment jsonb default null, p_request jsonb default null) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_order->>'id';
  v_sub_total numeric := (select coalesce(sum((x->>'sub_total')::numeric), 0) from jsonb_array_elements(p_items) x);
  -- Read before the items are replaced, leaving out lines merged from a request:
  -- an order that predates stock tracking stays untracked.
  v_tracked boolean := coalesce((
    select bool_and(stock_tracked) from order_items where order_id = p_order->>'id' and from_request_number is null
  ), true);
  -- Lines kept by id keep their own tracking and origin.
  v_old jsonb := coalesce((
    select jsonb_object_agg(oi.id, jsonb_build_object(
      'stock_tracked', oi.stock_tracked, 'from_request_number', oi.from_request_number, 'requested_date', oi.requested_date
    ))
    from order_items oi
    where oi.order_id = p_order->>'id'
  ), '{}'::jsonb);
  v_status text;
  v_parent_id text;
  v_parent orders%rowtype;
  v_requested_date date;
  v_order_number text;
begin
  select o.order_status, o.parent_order_id into v_status, v_parent_id from orders o where o.id = v_id;
  if v_status = 'cancelled' then
    raise exception 'A cancelled order can''t be edited';
  end if;
  if p_order->>'order_status' = 'cancelled' then
    raise exception 'Cancel an order with cancel_order';
  end if;

  -- A request is linked only when it's created. Everything but its items comes
  -- from the order, and its advance share is set when the order is saved.
  if v_status is null then
    v_parent_id := nullif(p_order->>'parent_order_id', '');
  end if;
  if v_parent_id is not null then
    select * into v_parent from orders o where o.id = v_parent_id;
    if not found or v_parent.order_status <> 'processing' then
      raise exception 'A request can only be linked to an order that is processing';
    end if;
    if p_order->>'order_status' <> 'requested' then
      raise exception 'Merge a linked request into its order instead of converting it';
    end if;
    p_order := p_order || jsonb_build_object(
      'customer_id', v_parent.customer_id,
      'order_date', v_parent.order_date,
      'requested_date', v_parent.order_date,
      'delivery_charge', 0,
      'delivery_location', v_parent.delivery_location,
      'delivery_provider_id', v_parent.delivery_provider_id,
      'payment_method_id', v_parent.payment_method_id,
      'note', v_parent.note
    );
    p_payment := null;
  end if;

  -- Shrink the advance first if the new total no longer covers it, so the
  -- amount_paid check holds; split_order_advance moves the rest to the requests.
  if p_payment is not null then
    update transactions t
    set amount = least(t.amount, greatest(v_sub_total + (p_order->>'delivery_charge')::numeric - (o.amount_paid - t.amount), 0))
    from orders o
    where o.id = v_id and t.order_id = v_id and t.is_advance;
  end if;

  -- requested_date is never overwritten once set.
  update orders set
    customer_id = p_order->>'customer_id',
    order_date = (p_order->>'order_date')::date,
    order_status = p_order->>'order_status',
    sub_total = v_sub_total,
    delivery_charge = (p_order->>'delivery_charge')::numeric,
    delivery_location = p_order->>'delivery_location',
    delivery_provider_id = p_order->>'delivery_provider_id',
    payment_method_id = p_order->>'payment_method_id',
    note = p_order->>'note'
  where id = v_id
  returning order_number, requested_date into v_order_number, v_requested_date;

  if found then
    -- Payments follow the order's customer.
    update transactions set customer_id = p_order->>'customer_id' where order_id = v_id;
  else
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id, note, requested_date, parent_order_id)
    values (
      v_id,
      p_order->>'customer_id',
      (p_order->>'order_date')::date,
      p_order->>'order_status',
      v_sub_total,
      (p_order->>'delivery_charge')::numeric,
      p_order->>'delivery_location',
      p_order->>'delivery_provider_id',
      p_order->>'payment_method_id',
      p_order->>'note',
      case when p_order->>'order_status' = 'requested'
        then coalesce((p_order->>'requested_date')::date, (p_order->>'order_date')::date) end,
      v_parent_id
    )
    returning order_number, requested_date into v_order_number, v_requested_date;
  end if;

  -- Requests are made to order: their items never touch stock, even after conversion.
  if v_requested_date is not null then
    v_tracked := false;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, variant_id, quantity, sub_total, stock_tracked, from_request_number, requested_date)
  select
    x->>'id', v_id, x->>'variant_id', (x->>'quantity')::integer, (x->>'sub_total')::numeric,
    coalesce((v_old->(x->>'id')->>'stock_tracked')::boolean, v_tracked),
    v_old->(x->>'id')->>'from_request_number',
    (v_old->(x->>'id')->>'requested_date')::date
  from jsonb_array_elements(p_items) x;

  -- Open linked requests mirror their order, and their payments follow its customer.
  update orders c set
    customer_id = o.customer_id,
    delivery_location = o.delivery_location,
    delivery_provider_id = o.delivery_provider_id,
    payment_method_id = o.payment_method_id,
    note = o.note
  from orders o
  where o.id = v_id and c.parent_order_id = v_id and c.order_status = 'requested';
  update transactions t set customer_id = c.customer_id
  from orders c
  where t.order_id = c.id and c.parent_order_id = v_id and c.order_status = 'requested';

  if p_request is not null and jsonb_array_length(coalesce(p_request->'items', '[]'::jsonb)) > 0 then
    perform save_order(
      jsonb_build_object('id', p_request->>'id', 'order_status', 'requested', 'parent_order_id', v_id),
      p_request->'items'
    );
  end if;

  -- After the new request is saved, so it can take a share.
  if p_payment is not null then
    perform split_order_advance(v_id, p_payment);
  end if;

  return v_order_number;
end;
$$;

-- Cancels an order. Stock-tracked items go back on the shelf and are marked
-- untracked, so deleting the order later doesn't restore them a second time.
-- Its open linked requests are cancelled with it.
create or replace function cancel_order(p_id text) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_status text;
begin
  select o.order_status into v_status from orders o where o.id = p_id for update;
  if not found then
    raise exception 'Order % not found', p_id;
  end if;
  if v_status not in ('requested', 'processing', 'ready_for_delivery') then
    raise exception 'This order can no longer be cancelled';
  end if;

  -- They hold no stock, so only their status changes. Any advance share stays as income.
  update orders set order_status = 'cancelled' where parent_order_id = p_id and order_status = 'requested';

  update product_variants v set quantity = v.quantity + x.quantity
  from (
    select oi.variant_id, sum(oi.quantity) as quantity
    from order_items oi
    where oi.order_id = p_id and oi.stock_tracked
    group by oi.variant_id
  ) x
  where v.id = x.variant_id;
  update order_items set stock_tracked = false where order_id = p_id and stock_tracked;

  update orders set order_status = 'cancelled' where id = p_id;
end;
$$;

-- Moves a linked request's items into its order as made-to-order lines
-- (untracked, so stock is untouched), carries over any payment as a plain one,
-- and deletes the request. Returns the order's number.
create or replace function merge_request(p_id text) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_request orders%rowtype;
  v_parent_number text;
begin
  select * into v_request from orders o where o.id = p_id for update;
  if not found then
    raise exception 'Request % not found', p_id;
  end if;
  if v_request.order_status <> 'requested' or v_request.parent_order_id is null then
    raise exception 'Only a pending linked request can be merged';
  end if;
  select o.order_number into v_parent_number
  from orders o
  where o.id = v_request.parent_order_id and o.order_status = 'processing'
  for update;
  if not found then
    raise exception 'Its order is no longer processing';
  end if;

  update order_items set
    order_id = v_request.parent_order_id,
    stock_tracked = false,
    from_request_number = v_request.order_number,
    requested_date = v_request.requested_date
  where order_id = p_id;
  update orders set sub_total = (
    select coalesce(sum(oi.sub_total), 0) from order_items oi where oi.order_id = v_request.parent_order_id
  )
  where id = v_request.parent_order_id;
  -- The order keeps its own advance.
  update transactions set order_id = v_request.parent_order_id, is_advance = false where order_id = p_id;
  delete from orders where id = p_id;

  return v_parent_number;
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
  insert into products (id, name, category_id, option_names)
  values (
    v_id,
    p_product->>'name',
    p_product->>'category_id',
    array(select jsonb_array_elements_text(p_product->'option_names'))
  )
  on conflict (id) do update set
    name = excluded.name,
    category_id = excluded.category_id,
    option_names = excluded.option_names;

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
revoke execute on function save_order(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function split_order_advance(text, jsonb) from public, anon, authenticated;
revoke execute on function save_product(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function cancel_order(text) from public, anon, authenticated;
revoke execute on function merge_request(text) from public, anon, authenticated;
grant execute on function cancel_order(text) to service_role;
grant execute on function merge_request(text) to service_role;
grant execute on function save_product(jsonb, jsonb) to service_role;
grant execute on function next_order_number() to service_role;
grant execute on function add_order_payment(text, jsonb) to service_role;
grant execute on function save_order(jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function split_order_advance(text, jsonb) to service_role;

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
-- collected for an outside provider isn't income, so once the order is
-- delivered it comes off the order's earliest payments first (until then the
-- payments count in full). Self delivery keeps its charge. A correlated
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
      and o.order_status = 'delivered'
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
-- Rows show the amount received, and delivery_fee is the part of it that is a
-- delivered order's outside delivery charge (see report_transactions). The
-- income total leaves that part out, like the Overview's.
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
      s.name as source_name, o.order_number,
      t.amount - rt.report_amount as delivery_fee
    from transactions t
    join report_transactions rt on rt.id = t.id
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
    'income', coalesce((select sum(f.amount - f.delivery_fee) from f where f.type = 'income'), 0),
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

-- One page of orders, with their items, payment count, advance and last payment
-- (the Record payment dialog's defaults), plus the tab's totals. p_tab 'orders'
-- lists everything but requests placed in the range; 'requests' lists every
-- pending request, whatever the range.
drop function if exists list_orders(date, date, text, text, text, text, boolean, integer, integer);
create or replace function list_orders(
  p_tab text,
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
      o.total_price, o.amount_paid, o.payment_status, o.requested_date, o.note,
      o.parent_order_id, po.order_number as parent_order_number,
      cu.name as customer_name, dp.name as delivery_provider_name, pm.name as payment_method_name
    from orders o
    join customers cu on cu.id = o.customer_id
    left join orders po on po.id = o.parent_order_id
    left join delivery_providers dp on dp.id = o.delivery_provider_id
    left join payment_methods pm on pm.id = o.payment_method_id
    where (
        case when p_tab = 'requests'
          then o.order_status = 'requested'
          else o.order_status <> 'requested' and o.order_date between p_start and p_end
        end
      )
      and (p_order_status is null or o.order_status::text = p_order_status)
      and (p_payment_status is null or o.payment_status::text = p_payment_status)
      and (
        nullif(trim(p_search), '') is null
        or o.order_number ilike '%' || trim(p_search) || '%'
        or coalesce(po.order_number, '') ilike '%' || trim(p_search) || '%'
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
        then array_position(array['requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'], f.order_status) end asc,
      case when p_sort = 'status' and p_desc
        then array_position(array['requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'], f.order_status) end desc,
      case when p_sort = 'requestedDate' and not p_desc then f.requested_date end asc,
      case when p_sort = 'requestedDate' and p_desc then f.requested_date end desc,
      case when p_sort = 'orderDate' and not p_desc then f.order_date end asc,
      case when p_sort = 'orderDate' and not p_desc then f.order_number end asc,
      case when p_tab = 'requests' then f.requested_date end desc,
      f.order_date desc, f.order_number desc
    ) as rn
    from f
  ),
  page as (
    select * from ranked r where r.rn > p_offset and r.rn <= p_offset + p_limit
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    -- Orders tab: cancelled orders are listed but left out of the totals.
    'order_count', (select count(*) from f where f.order_status <> 'cancelled'),
    'revenue', coalesce((select sum(f.total_price) from f where f.order_status <> 'cancelled'), 0),
    'balance_due', coalesce((select sum(f.total_price - f.amount_paid) from f where f.order_status <> 'cancelled'), 0),
    'open_count', (select count(*) from f where f.order_status not in ('delivered', 'cancelled')),
    -- Requests tab.
    'pending_count', (select count(*) from f where f.order_status = 'requested'),
    'request_value', coalesce((select sum(f.total_price) from f where f.order_status = 'requested'), 0),
    'advance_total', coalesce((select sum(f.amount_paid) from f where f.order_status = 'requested'), 0),
    'rows', coalesce((
      select jsonb_agg((to_jsonb(p) - 'rn') || jsonb_build_object(
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', oi.id, 'variant_id', oi.variant_id, 'quantity', oi.quantity, 'sub_total', oi.sub_total,
            'from_request_number', oi.from_request_number,
            'product_name', pr.name, 'option_names', to_jsonb(pr.option_names), 'options', v.options
          ) order by pr.name, oi.from_request_number nulls first, oi.id)
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          join products pr on pr.id = v.product_id
          where oi.order_id = p.id
        ), '[]'::jsonb),
        'pending_request_numbers', coalesce((
          select jsonb_agg(c.order_number order by c.order_number)
          from orders c
          where c.parent_order_id = p.id and c.order_status = 'requested'
        ), '[]'::jsonb),
        'tracked_units', coalesce((select sum(oi.quantity) from order_items oi where oi.order_id = p.id and oi.stock_tracked), 0),
        'payment_count', (select count(*) from transactions t where t.order_id = p.id),
        'advance_amount', (select t.amount from transactions t where t.order_id = p.id and t.is_advance),
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

-- The request editor's parent-order picker: processing orders matching the
-- search (number or customer), one page at a time.
create or replace function search_parent_orders(p_search text, p_limit integer, p_offset integer) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select
      o.id, o.order_number, o.order_date, o.customer_id, cu.name as customer_name,
      o.delivery_charge, o.delivery_location, o.delivery_provider_id, o.payment_method_id, o.note,
      -- The whole advance: the order's own plus its open linked requests' shares.
      (
        select sum(t.amount)
        from transactions t
        join orders c on c.id = t.order_id
        where t.is_advance and (c.id = o.id or (c.parent_order_id = o.id and c.order_status = 'requested'))
      ) as advance_amount
    from orders o
    join customers cu on cu.id = o.customer_id
    where o.order_status = 'processing'
      and (
        nullif(trim(p_search), '') is null
        or o.order_number ilike '%' || trim(p_search) || '%'
        or cu.name ilike '%' || trim(p_search) || '%'
      )
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.order_date desc, r.order_number desc)
      from (select * from f order by f.order_date desc, f.order_number desc limit p_limit offset p_offset) r
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
      where o.delivery_provider_id is null and o.order_date between p_start and p_end
        and o.order_status not in ('requested', 'cancelled')),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'order_count', (select count(*) from orders o where o.delivery_provider_id = d.id),
        'in_range', coalesce((select sum(o.delivery_charge) from orders o
          where o.delivery_provider_id = d.id and o.order_date between p_start and p_end
            and o.order_status not in ('requested', 'cancelled')), 0)
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
      where o.payment_method_id is null and o.order_date between p_start and p_end
        and o.order_status not in ('requested', 'cancelled')),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'order_count', (select count(*) from orders o where o.payment_method_id = m.id),
        'in_range', coalesce((select sum(o.total_price) from orders o
          where o.payment_method_id = m.id and o.order_date between p_start and p_end
            and o.order_status not in ('requested', 'cancelled')), 0)
      ) order by m.name)
      from payment_methods m
    ), '[]'::jsonb)
  )
$$;

-- Stock totals across every variant, and per product with how many orders use it.
-- A category filter narrows the totals as well as the rows.
create or replace function product_summary(p_category_id text default null) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with fp as (
    select p.* from products p where p_category_id is null or p.category_id = p_category_id
  ), fv as (
    select v.* from product_variants v join fp on fp.id = v.product_id
  )
  select jsonb_build_object(
    'units', coalesce((select sum(fv.quantity) from fv), 0),
    'stock_value', coalesce((select sum(fv.quantity * fv.price) from fv), 0),
    'out_of_stock', (select count(*) from fv where fv.quantity = 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category_id', p.category_id,
        'category_name', c.name,
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
      from fp p
      join product_categories c on c.id = p.category_id
    ), '[]'::jsonb)
  )
$$;

-- Each product category with how many products it holds.
create or replace function product_category_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'product_count', (select count(*) from products p where p.category_id = c.id)
  ) order by c.name), '[]'::jsonb)
  from product_categories c
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
revoke execute on function list_orders(text, date, date, text, text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function search_parent_orders(text, integer, integer) from public, anon, authenticated;
revoke execute on function budget_summary(date, date) from public, anon, authenticated;
revoke execute on function customer_summary(date, date) from public, anon, authenticated;
revoke execute on function category_summary() from public, anon, authenticated;
revoke execute on function channel_summary() from public, anon, authenticated;
revoke execute on function source_summary(date, date) from public, anon, authenticated;
revoke execute on function delivery_provider_summary(date, date) from public, anon, authenticated;
revoke execute on function payment_method_summary(date, date) from public, anon, authenticated;
revoke execute on function product_summary(text) from public, anon, authenticated;
revoke execute on function product_category_summary() from public, anon, authenticated;
revoke execute on function variants_in_use(text) from public, anon, authenticated;
grant execute on function overview_summary(date, date, date, date, boolean) to service_role;
grant execute on function list_transactions(date, date, text, text, text, boolean, integer, integer) to service_role;
grant execute on function list_invoices(date, date, date, text, boolean, integer, integer) to service_role;
grant execute on function list_orders(text, date, date, text, text, text, text, boolean, integer, integer) to service_role;
grant execute on function search_parent_orders(text, integer, integer) to service_role;
grant execute on function budget_summary(date, date) to service_role;
grant execute on function customer_summary(date, date) to service_role;
grant execute on function category_summary() to service_role;
grant execute on function channel_summary() to service_role;
grant execute on function source_summary(date, date) to service_role;
grant execute on function delivery_provider_summary(date, date) to service_role;
grant execute on function payment_method_summary(date, date) to service_role;
grant execute on function product_summary(text) to service_role;
grant execute on function product_category_summary() to service_role;
grant execute on function variants_in_use(text) to service_role;
