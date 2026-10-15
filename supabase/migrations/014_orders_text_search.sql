-- Add text and status filters to the server-side orders list used by the Orders page.
drop function if exists list_orders(date, date, text, boolean, integer, integer);
drop function if exists list_orders(date, date, text, text, boolean, integer, integer);

create or replace function list_orders(
  p_start date,
  p_end date,
  p_search text,
  p_order_status text,
  p_payment_status text,
  p_sort text,
  p_desc boolean,
  p_limit integer,
  p_offset integer
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

revoke execute on function list_orders(date, date, text, text, text, text, boolean, integer, integer) from public, anon, authenticated;
grant execute on function list_orders(date, date, text, text, text, text, boolean, integer, integer) to service_role;
