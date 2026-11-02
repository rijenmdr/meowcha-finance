-- Server-side search for the customer and product-variant pickers, one page at
-- a time, so the dashboard no longer loads every customer and product.
-- Callers ask for one row more than a page to learn whether there is a next page.

create or replace function search_customers(p_search text, p_limit integer, p_offset integer) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.name, r.id), '[]'::jsonb)
  from (
    select c.id, c.name, c.company
    from customers c
    where nullif(trim(p_search), '') is null
      or c.name ilike '%' || trim(p_search) || '%'
      or c.company ilike '%' || trim(p_search) || '%'
      or c.phone ilike '%' || trim(p_search) || '%'
    order by c.name, c.id
    limit p_limit offset p_offset
  ) r
$$;

-- Variants matching the search by product name or option value. p_exclude_ids
-- leaves out variants already on the order. p_out_of_stock_only is for requests.
create or replace function search_variants(
  p_search text, p_out_of_stock_only boolean, p_exclude_ids text[], p_limit integer, p_offset integer
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.name, r.id), '[]'::jsonb)
  from (
    select v.id, p.name, p.option_names, v.options, v.price, v.quantity
    from product_variants v
    join products p on p.id = v.product_id
    where (not p_out_of_stock_only or v.quantity = 0)
      and not (v.id = any(coalesce(p_exclude_ids, '{}')))
      and (
        nullif(trim(p_search), '') is null
        or p.name ilike '%' || trim(p_search) || '%'
        or exists (
          select 1 from jsonb_each_text(v.options) o where o.value ilike '%' || trim(p_search) || '%'
        )
      )
    order by p.name, v.id
    limit p_limit offset p_offset
  ) r
$$;

-- The customer editor needs the notes, which it used to read from the lookups.
create or replace function customer_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_start and p_end), 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'company', c.company, 'email', c.email, 'phone', c.phone, 'notes', c.notes,
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

revoke execute on function search_customers(text, integer, integer) from public, anon, authenticated;
revoke execute on function search_variants(text, boolean, text[], integer, integer) from public, anon, authenticated;
grant execute on function search_customers(text, integer, integer) to service_role;
grant execute on function search_variants(text, boolean, text[], integer, integer) to service_role;
