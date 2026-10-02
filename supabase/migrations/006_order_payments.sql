-- Records order payments as income transactions. Each payment is a
-- transaction linked by order_id, and orders.amount_paid becomes the sum of
-- those payments, kept current by a trigger. Run once, after 005_orders.sql.

begin;

-- Default category for order payments (any income category can be chosen).
insert into categories (name, type) values ('Order Sales', 'income')
on conflict (type, name) do nothing;

-- Deleting an order keeps its payments as plain income: the money was still received.
alter table transactions add column if not exists order_id text references orders(id) on delete set null;
alter table transactions drop constraint if exists transactions_order_income_check;
alter table transactions add constraint transactions_order_income_check check (order_id is null or type = 'income');

-- Orders paid before this migration get one payment each, so that
-- recomputing amount_paid from transactions doesn't reset them to zero.
insert into transactions (id, date, type, category_id, description, amount, customer_id, order_id)
select gen_random_uuid()::text, o.order_date, 'income', c.id, 'Payment for ' || o.order_number, o.amount_paid, o.customer_id, o.id
from orders o
cross join (select id from categories where type = 'income' and name = 'Order Sales') c
where o.amount_paid > 0
  and not exists (select 1 from transactions t where t.order_id = o.id);

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

-- amount_paid is no longer written here: it follows the order's payments.
-- p_payment, when given, is recorded as the order's first payment.
drop function if exists save_order(jsonb, jsonb);
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
    delivery_charge = (p_order->>'delivery_charge')::numeric
  where id = v_id
  returning order_number into v_order_number;

  if found then
    -- Payments follow the order's customer.
    update transactions set customer_id = p_order->>'customer_id' where order_id = v_id;
  else
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge)
    values (
      v_id,
      p_order->>'customer_id',
      (p_order->>'order_date')::date,
      p_order->>'order_status',
      v_sub_total,
      (p_order->>'delivery_charge')::numeric
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

-- Only the server (service role) may call these.
revoke execute on function add_order_payment(text, jsonb) from public, anon, authenticated;
revoke execute on function save_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function add_order_payment(text, jsonb) to service_role;
grant execute on function save_order(jsonb, jsonb, jsonb) to service_role;

commit;
