alter table order_items alter column variant_id drop not null;
alter table order_items add column if not exists item_name text;
alter table order_items add column if not exists item_details text not null default '';

update order_items oi
set item_name = p.name,
    item_details = coalesce((
      select string_agg(v.options ->> opt.name, ', ' order by opt.ordinality)
      from unnest(p.option_names) with ordinality as opt(name, ordinality)
      where nullif(v.options ->> opt.name, '') is not null
    ), '')
from product_variants v
join products p on p.id = v.product_id
where v.id = oi.variant_id and oi.item_name is null;

alter table order_items alter column item_name set not null;

create or replace function apply_order_item_stock() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.stock_tracked and new.variant_id is not null then
    update product_variants set quantity = quantity - new.quantity where id = new.variant_id;
  elsif tg_op = 'DELETE' and old.stock_tracked and old.variant_id is not null then
    update product_variants set quantity = quantity + old.quantity where id = old.variant_id;
  end if;
  return null;
end;
$$;

create or replace function save_order(p_order jsonb, p_items jsonb, p_payment jsonb default null, p_request jsonb default null) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_order->>'id';
  v_sub_total numeric := (select coalesce(sum((x->>'sub_total')::numeric), 0) from jsonb_array_elements(p_items) x);
  v_tracked boolean := coalesce((
    select bool_and(stock_tracked) from order_items
    where order_id = p_order->>'id' and from_request_number is null and variant_id is not null
  ), true);
  v_old jsonb := coalesce((
    select jsonb_object_agg(oi.id, jsonb_build_object(
      'stock_tracked', oi.stock_tracked, 'variant_id', oi.variant_id,
      'from_request_number', oi.from_request_number, 'requested_date', oi.requested_date
    ))
    from order_items oi where oi.order_id = p_order->>'id'
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

  if p_payment is not null then
    update transactions t
    set amount = least(t.amount, greatest(v_sub_total + (p_order->>'delivery_charge')::numeric - (o.amount_paid - t.amount), 0))
    from orders o
    where o.id = v_id and t.order_id = v_id and t.is_advance;
  end if;

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
    update transactions set customer_id = p_order->>'customer_id' where order_id = v_id;
  else
    insert into orders (id, customer_id, order_date, order_status, sub_total, delivery_charge, delivery_location, delivery_provider_id, payment_method_id, note, requested_date, parent_order_id)
    values (
      v_id, p_order->>'customer_id', (p_order->>'order_date')::date, p_order->>'order_status',
      v_sub_total, (p_order->>'delivery_charge')::numeric, p_order->>'delivery_location',
      p_order->>'delivery_provider_id', p_order->>'payment_method_id', p_order->>'note',
      case when p_order->>'order_status' = 'requested'
        then coalesce((p_order->>'requested_date')::date, (p_order->>'order_date')::date) end,
      v_parent_id
    )
    returning order_number, requested_date into v_order_number, v_requested_date;
  end if;

  if v_requested_date is not null then
    v_tracked := false;
  end if;

  delete from order_items where order_id = v_id;
  insert into order_items (id, order_id, variant_id, item_name, item_details, quantity, sub_total, stock_tracked, from_request_number, requested_date)
  select
    x->>'id', v_id, nullif(x->>'variant_id', ''), x->>'item_name', coalesce(x->>'item_details', ''),
    (x->>'quantity')::integer, (x->>'sub_total')::numeric,
    case
      when nullif(x->>'variant_id', '') is null then false
      when v_old->(x->>'id')->>'variant_id' is null then v_tracked
      else coalesce((v_old->(x->>'id')->>'stock_tracked')::boolean, v_tracked)
    end,
    v_old->(x->>'id')->>'from_request_number',
    (v_old->(x->>'id')->>'requested_date')::date
  from jsonb_array_elements(p_items) x;

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

  if p_payment is not null then
    perform split_order_advance(v_id, p_payment);
  end if;

  return v_order_number;
end;
$$;

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
          select 1 from order_items oi
          where oi.order_id = o.id
            and (oi.item_name ilike '%' || trim(p_search) || '%' or oi.item_details ilike '%' || trim(p_search) || '%')
        )
      )
  ),
  ranked as (
    select f.*, row_number() over (order by
      case when p_sort = 'customer' and not p_desc then f.customer_name end asc,
      case when p_sort = 'customer' and p_desc then f.customer_name end desc,
      case when not p_desc then case p_sort when 'totalPrice' then f.total_price when 'amountPaid' then f.amount_paid end end asc,
      case when p_desc then case p_sort when 'totalPrice' then f.total_price when 'amountPaid' then f.amount_paid end end desc,
      case when p_sort = 'status' and not p_desc then array_position(array['requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'], f.order_status) end asc,
      case when p_sort = 'status' and p_desc then array_position(array['requested', 'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'], f.order_status) end desc,
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
    'order_count', (select count(*) from f where f.order_status <> 'cancelled'),
    'revenue', coalesce((select sum(f.total_price) from f where f.order_status <> 'cancelled'), 0),
    'balance_due', coalesce((select sum(f.total_price - f.amount_paid) from f where f.order_status <> 'cancelled'), 0),
    'open_count', (select count(*) from f where f.order_status not in ('delivered', 'cancelled')),
    'pending_count', (select count(*) from f where f.order_status = 'requested'),
    'request_value', coalesce((select sum(f.total_price) from f where f.order_status = 'requested'), 0),
    'advance_total', coalesce((select sum(f.amount_paid) from f where f.order_status = 'requested'), 0),
    'rows', coalesce((
      select jsonb_agg((to_jsonb(p) - 'rn') || jsonb_build_object(
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', oi.id, 'variant_id', oi.variant_id, 'quantity', oi.quantity, 'sub_total', oi.sub_total,
            'from_request_number', oi.from_request_number, 'item_name', oi.item_name, 'item_details', oi.item_details
          ) order by oi.item_name, oi.from_request_number nulls first, oi.id)
          from order_items oi where oi.order_id = p.id
        ), '[]'::jsonb),
        'pending_request_numbers', coalesce((
          select jsonb_agg(c.order_number order by c.order_number)
          from orders c where c.parent_order_id = p.id and c.order_status = 'requested'
        ), '[]'::jsonb),
        'tracked_units', coalesce((select sum(oi.quantity) from order_items oi where oi.order_id = p.id and oi.stock_tracked), 0),
        'payment_count', (select count(*) from transactions t where t.order_id = p.id),
        'advance_amount', (select t.amount from transactions t where t.order_id = p.id and t.is_advance),
        'last_payment', (
          select jsonb_build_object('category_id', t.category_id, 'channel_id', t.channel_id)
          from transactions t where t.order_id = p.id order by t.date desc, t.id desc limit 1
        )
      ) order by p.rn)
      from page p
    ), '[]'::jsonb)
  )
$$;