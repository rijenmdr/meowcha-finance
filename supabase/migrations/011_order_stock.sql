-- Takes stock off a variant when an order item is saved and puts it back when
-- the item is removed. Run once, after 010_product_variants.sql.
--
-- Items that existed before this migration are marked untracked: your stock
-- counts already reflect those orders, so they must not be deducted again (or
-- restored when such an order is edited or deleted).

begin;

-- Added with default false so existing rows are untracked, then new rows default to tracked.
alter table order_items add column if not exists stock_tracked boolean not null default false;
alter table order_items alter column stock_tracked set default true;

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
  -- product_id is the pre-variants key, accepted until 012 so the old app build keeps working.
  insert into order_items (id, order_id, variant_id, quantity, sub_total, stock_tracked)
  select x->>'id', v_id, coalesce(x->>'variant_id', x->>'product_id'), (x->>'quantity')::integer, (x->>'sub_total')::numeric, v_tracked
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
