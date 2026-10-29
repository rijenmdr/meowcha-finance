-- Linked requests: an order whose items are partly out of stock is saved as an
-- order (the stocked items) plus a request linked to it (the shortfall, made to
-- order). Merging the request moves its items into the order and deletes it.

-- 1. The link. Only a request has one, and it never changes. Deleting the
-- order deletes its linked requests: they hold no stock, and their advance
-- shares stay as unlinked income.
alter table orders add column if not exists parent_order_id text references orders(id) on delete cascade;
alter table orders drop constraint if exists orders_parent_check;
alter table orders add constraint orders_parent_check check (parent_order_id is null or requested_date is not null);
create index if not exists orders_parent_order_id_idx on orders (parent_order_id) where parent_order_id is not null;

-- 2. Lines merged in from a request keep where they came from, and sit next to
-- the stocked line for the same variant.
alter table order_items add column if not exists from_request_number text;
alter table order_items add column if not exists requested_date date;
alter table order_items drop constraint if exists order_items_order_id_variant_id_key;
create unique index if not exists order_items_variant_per_source
  on order_items (order_id, variant_id, coalesce(from_request_number, ''));

-- 3. Status rules: a request's link is fixed, a linked request is merged rather
-- than converted, and an order can't move on while a linked request is open.
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

-- 4a. Spreads an order's advance (p_payment: everything the customer paid up
-- front) over the order and its open linked requests: the order first, up to
-- what its total leaves after later payments, then each request in the order
-- it was made. A request's share copies the payment's date, category and
-- channel, and a share of 0 removes that record's advance.
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

revoke execute on function split_order_advance(text, jsonb) from public, anon, authenticated;
grant execute on function split_order_advance(text, jsonb) to service_role;

-- 4b. save_order: per-line stock tracking, linked requests that mirror their
-- order, p_request (the editor's shortfall, saved as a linked request), and
-- p_payment as the whole advance, split over the order and its requests.
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

revoke execute on function save_order(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function save_order(jsonb, jsonb, jsonb, jsonb) to service_role;

-- 5. Cancelling an order cancels its open linked requests too.
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

-- 6. Moves a linked request's items into its order as made-to-order lines
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

revoke execute on function merge_request(text) from public, anon, authenticated;
grant execute on function merge_request(text) to service_role;

-- 7. The request editor's parent-order picker: processing orders matching the
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

revoke execute on function search_parent_orders(text, integer, integer) from public, anon, authenticated;
grant execute on function search_parent_orders(text, integer, integer) to service_role;

-- 8. list_orders rows gain the request link (parent number, open linked
-- requests) and each item's origin.
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
