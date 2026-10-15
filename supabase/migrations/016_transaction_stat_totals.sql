-- Add transaction income/expense aggregates so the Transactions page can show
-- summary stat cards for the active date/filter range.
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
