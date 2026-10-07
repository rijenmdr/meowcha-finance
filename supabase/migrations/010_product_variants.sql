-- Splits products into a product (name + option names) and its variants
-- (option values, stock, price). Run once, after 009_order_delivery_location.sql.
--
-- Non-destructive: the old table is kept as products_legacy and
-- order_items.product_id is kept (nullable) until 012_drop_legacy_products.sql.
-- Every old products.id becomes the id of its variant, so existing order items
-- keep pointing at the same row. Take a backup before running.
--
-- Rollback before 012: drop products and product_variants, rename
-- products_legacy back to products, restore order_items.product_id's FK and
-- not null, and re-run the save_order from 009.

begin;

do $$
begin
  if to_regclass('public.products_legacy') is not null then
    raise exception 'products_legacy already exists: this migration has already run';
  end if;
end $$;

alter table products rename to products_legacy;
alter table products_legacy rename constraint products_pkey to products_legacy_pkey;
alter table products_legacy alter column id drop default;

create table products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  -- Ordered names of the options each variant sets, e.g. {Color,Type}.
  option_names text[] not null default '{}'
);
create unique index products_name_key on products (lower(btrim(name)));

create table product_variants (
  id text primary key default gen_random_uuid()::text,
  product_id text not null references products(id) on delete cascade,
  -- One value per option name, e.g. {"Color": "Olive", "Type": "Lined"}.
  options jsonb not null default '{}',
  quantity integer not null default 0 check (quantity >= 0),
  price numeric not null check (price >= 0),
  unique (product_id, options)
);
create index product_variants_product_id_idx on product_variants (product_id);

alter table products enable row level security;
alter table product_variants enable row level security;

-- Legacy rows that differ only by name case or spacing merge into one product.
insert into products (id, name, option_names)
select gen_random_uuid()::text, min(btrim(name)), array['Color', 'Type']
from products_legacy
group by lower(btrim(name));

insert into product_variants (id, product_id, options, quantity, price)
select
  l.id,
  p.id,
  jsonb_build_object(
    'Color', coalesce(nullif(btrim(l.color), ''), 'Default'),
    'Type', initcap(l.type)
  ),
  l.quantity,
  l.price
from products_legacy l
join products p on lower(btrim(p.name)) = lower(btrim(l.name));

alter table order_items add column variant_id text;
update order_items set variant_id = product_id;
alter table order_items alter column variant_id set not null;
alter table order_items add constraint order_items_variant_id_fkey
  foreign key (variant_id) references product_variants(id);
alter table order_items add constraint order_items_order_id_variant_id_key unique (order_id, variant_id);

-- Detach the legacy link so the old table can be dropped later; the old app
-- build still writes product_id, which save_order below accepts as a fallback.
alter table order_items drop constraint if exists order_items_product_id_fkey;
alter table order_items drop constraint if exists order_items_order_id_product_id_key;
alter table order_items alter column product_id drop not null;

do $$
begin
  if (select count(*) from product_variants) <> (select count(*) from products_legacy) then
    raise exception 'variant count does not match legacy product count';
  end if;
  if exists (
    select 1 from order_items oi
    left join product_variants v on v.id = oi.variant_id
    where v.id is null
  ) then
    raise exception 'an order item has no matching variant';
  end if;
  if (select coalesce(sum(price * quantity), 0) from product_variants)
     <> (select coalesce(sum(price * quantity), 0) from products_legacy) then
    raise exception 'stock value does not match legacy products';
  end if;
end $$;

create or replace function save_order(p_order jsonb, p_items jsonb, p_payment jsonb default null) returns text
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
  -- product_id is the pre-variants key, accepted until 012 so the old app build keeps working.
  insert into order_items (id, order_id, variant_id, quantity, sub_total)
  select x->>'id', v_id, coalesce(x->>'variant_id', x->>'product_id'), (x->>'quantity')::integer, (x->>'sub_total')::numeric
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

revoke execute on function save_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function save_product(jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_order(jsonb, jsonb, jsonb) to service_role;
grant execute on function save_product(jsonb, jsonb) to service_role;

commit;
