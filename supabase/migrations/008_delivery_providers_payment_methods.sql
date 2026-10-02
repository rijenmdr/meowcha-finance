-- Adds delivery providers and payment methods, each optionally linked to an
-- order. Existing orders stay unlinked until an admin picks one. Run once,
-- after 007_order_number_default.sql.

begin;

create table if not exists delivery_providers (
  id text primary key default gen_random_uuid()::text,
  name text not null unique
);
alter table delivery_providers enable row level security;

create table if not exists payment_methods (
  id text primary key default gen_random_uuid()::text,
  name text not null unique
);
alter table payment_methods enable row level security;

alter table orders add column if not exists delivery_provider_id text references delivery_providers(id) on delete set null;
alter table orders add column if not exists payment_method_id text references payment_methods(id) on delete set null;

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
    delivery_provider_id = p_order->>'delivery_provider_id',
    payment_method_id = p_order->>'payment_method_id'
  where id = v_id
  returning order_number into v_order_number;

  if found then
    -- Payments follow the order's customer.
    update transactions set customer_id = p_order->>'customer_id' where order_id = v_id;
  else
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_provider_id, payment_method_id)
    values (
      v_id,
      p_order->>'customer_id',
      (p_order->>'order_date')::date,
      p_order->>'order_status',
      v_sub_total,
      (p_order->>'delivery_charge')::numeric,
      p_order->>'delivery_provider_id',
      p_order->>'payment_method_id'
    )
    returning order_number into v_order_number;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, product_id, quantity, sub_total)
  select x->>'id', v_id, x->>'product_id', (x->>'quantity')::integer, (x->>'sub_total')::numeric
  from jsonb_array_elements(p_items) x;

  if p_payment is not null then
    perform add_order_payment(v_id, p_payment);
  end if;

  return v_order_number;
end;
$$;

revoke execute on function save_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_order(jsonb, jsonb, jsonb) to service_role;

commit;
