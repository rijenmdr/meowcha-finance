-- Order requests: a customer can ask for products that are out of stock (made
-- to order). A request is an orders row with order_status = 'requested'; it is
-- later converted into a normal order, or cancelled. Orders can be cancelled too.

-- 1. New statuses, the request date and a free-text note.
alter table orders drop constraint if exists orders_order_status_check;
alter table orders add constraint orders_order_status_check
  check (order_status in ('requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'));
-- Set when the order is created as a request and kept after conversion.
alter table orders add column if not exists requested_date date;
alter table orders add column if not exists note text;
alter table orders drop constraint if exists orders_requested_date_check;
alter table orders add constraint orders_requested_date_check
  check (order_status <> 'requested' or requested_date is not null);

-- 2. An order's advance: the one payment the order editor creates and edits.
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

-- Existing orders: their earliest payment was the one taken with the order.
update transactions t set is_advance = true
where t.id in (
  select distinct on (p.order_id) p.id
  from transactions p
  where p.order_id is not null
  order by p.order_id, p.date, p.id
)
and not exists (select 1 from transactions a where a.order_id = t.order_id and a.is_advance);

-- 3. Status rules the app relies on.
create or replace function guard_order_status() returns trigger
language plpgsql
as $$
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
  if new.order_status is distinct from old.order_status then
    if new.order_status = 'requested' then
      raise exception 'Order % can''t go back to requested', old.order_number;
    end if;
    if old.order_status = 'requested' and new.order_status not in ('processing', 'cancelled') then
      raise exception 'Request % can only be converted to processing or cancelled', old.order_number;
    end if;
    if new.order_status = 'cancelled' and old.order_status not in ('requested', 'processing', 'ready_for_delivery') then
      raise exception 'Order % can no longer be cancelled', old.order_number;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_status on orders;
create trigger orders_guard_status
  before update on orders
  for each row execute function guard_order_status();

-- 5. Requests hold a single advance, and cancelled orders take no payments.
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

-- 4. save_order: note, requested_date, untracked request items, and p_payment
-- as the order's advance (inserted once, then updated on later saves).
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
  v_status text;
  v_requested_date date;
  v_order_number text;
  v_advance_id text;
begin
  select o.order_status into v_status from orders o where o.id = v_id;
  if v_status = 'cancelled' then
    raise exception 'A cancelled order can''t be edited';
  end if;
  if p_order->>'order_status' = 'cancelled' then
    raise exception 'Cancel an order with cancel_order';
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
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id, note, requested_date)
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
        then coalesce((p_order->>'requested_date')::date, (p_order->>'order_date')::date) end
    )
    returning order_number, requested_date into v_order_number, v_requested_date;
  end if;

  -- Requests are made to order: their items never touch stock, even after conversion.
  if v_requested_date is not null then
    v_tracked := false;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, variant_id, quantity, sub_total, stock_tracked)
  select x->>'id', v_id, x->>'variant_id', (x->>'quantity')::integer, (x->>'sub_total')::numeric, v_tracked
  from jsonb_array_elements(p_items) x;

  if p_payment is not null then
    select t.id into v_advance_id from transactions t where t.order_id = v_id and t.is_advance;
    if v_advance_id is null then
      insert into transactions (id, date, type, category_id, description, amount, channel_id, customer_id, order_id, is_advance)
      values (
        p_payment->>'id',
        (p_payment->>'date')::date,
        'income',
        p_payment->>'category_id',
        'Advance for ' || v_order_number,
        (p_payment->>'amount')::numeric,
        p_payment->>'channel_id',
        p_order->>'customer_id',
        v_id,
        true
      );
    else
      update transactions set
        date = (p_payment->>'date')::date,
        amount = (p_payment->>'amount')::numeric,
        category_id = p_payment->>'category_id',
        channel_id = p_payment->>'channel_id'
      where id = v_advance_id;
    end if;
  end if;

  return v_order_number;
end;
$$;

-- 6. Cancels an order. Stock-tracked items go back on the shelf and are marked
-- untracked, so deleting the order later doesn't restore them a second time.
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

revoke execute on function cancel_order(text) from public, anon, authenticated;
grant execute on function cancel_order(text) to service_role;

-- 7. An outside provider's delivery charge only comes off the payments once the
-- order is delivered. Until then the payments count in full.
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

-- 8. list_orders gains p_tab ('orders' | 'requests').
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
      cu.name as customer_name, dp.name as delivery_provider_name, pm.name as payment_method_name
    from orders o
    join customers cu on cu.id = o.customer_id
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
            'product_name', pr.name, 'option_names', to_jsonb(pr.option_names), 'options', v.options
          ) order by pr.name, oi.id)
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          join products pr on pr.id = v.product_id
          where oi.order_id = p.id
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

revoke execute on function list_orders(text, date, date, text, text, text, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function list_orders(text, date, date, text, text, text, text, boolean, integer, integer) to service_role;

-- 9. Requested and cancelled orders stay in order_count (delete checks) but
-- out of the in-range totals.
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
