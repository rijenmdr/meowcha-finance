-- Moves the dashboard's totals, breakdowns and list paging into the database.
-- The app used to load every row and aggregate in the browser; these functions
-- return only what a page shows. Safe to re-run.

create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_order_id_idx on transactions (order_id);
create index if not exists transactions_category_id_idx on transactions (category_id);
create index if not exists transactions_channel_id_idx on transactions (channel_id);
create index if not exists transactions_source_id_idx on transactions (source_id);
create index if not exists transactions_customer_id_idx on transactions (customer_id);
create index if not exists invoices_issue_date_idx on invoices (issue_date);
create index if not exists orders_order_date_idx on orders (order_date);
create index if not exists orders_customer_id_idx on orders (customer_id);
create index if not exists order_items_variant_id_idx on order_items (variant_id);

-- Every transaction with the amount the reports count. A delivery charge
-- collected for an outside provider isn't income, so it comes off the order's
-- earliest payments first. Self delivery keeps its charge. A correlated
-- subquery rather than a window, so date filters still use the index.
-- security_invoker keeps RLS in force for anyone but the service role.
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
      and o.delivery_charge > 0
      and lower(btrim(coalesce(dp.name, ''))) <> 'self delivery'
  ), 0) as report_amount
from transactions t;

-- Overview: totals for the range and the prior one, cash flow per day or
-- month, the top expense categories and the latest transactions.
create or replace function overview_summary(
  p_start date, p_end date, p_prev_start date, p_prev_end date, p_monthly boolean
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_start and p_end), 0),
    'expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_start and p_end), 0),
    'prev_income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_prev_start and p_prev_end), 0),
    'prev_expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_prev_start and p_prev_end), 0),
    'cash_flow', coalesce((
      select jsonb_agg(jsonb_build_object('key', b.key, 'income', b.income, 'expense', b.expense) order by b.key)
      from (
        select
          to_char(r.date, case when p_monthly then 'YYYY-MM' else 'YYYY-MM-DD' end) as key,
          coalesce(sum(r.report_amount) filter (where r.type = 'income'), 0) as income,
          coalesce(sum(r.report_amount) filter (where r.type = 'expense'), 0) as expense
        from report_transactions r
        where r.date between p_start and p_end
        group by 1
      ) b
    ), '[]'::jsonb),
    'expense_categories', coalesce((
      select jsonb_agg(jsonb_build_object('category_id', x.category_id, 'name', x.name, 'amount', x.amount) order by x.amount desc, x.name)
      from (
        select t.category_id, c.name, sum(t.amount) as amount
        from transactions t
        join categories c on c.id = t.category_id
        where t.type = 'expense' and t.date between p_start and p_end
        group by t.category_id, c.name
        order by amount desc, c.name
        limit 6
      ) x
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'date', x.date, 'type', x.type, 'description', x.description, 'amount', x.amount)
        order by x.date desc, x.id desc)
      from (
        select t.id, t.date, t.type, t.description, t.amount
        from transactions t
        where t.date between p_start and p_end
        order by t.date desc, t.id desc
        limit 6
      ) x
    ), '[]'::jsonb)
  )
$$;

-- One page of transactions with the names they link to, plus the match count.
-- p_type / p_category_id are null for "all". Unknown sort keys fall back to newest first.
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
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) - 'rn' order by r.rn)
      from ranked r
      where r.rn > p_offset and r.rn <= p_offset + p_limit
    ), '[]'::jsonb)
  )
$$;

-- One page of invoices issued in the range, with the range's totals.
create or replace function list_invoices(
  p_start date, p_end date, p_today date,
  p_sort text, p_desc boolean, p_limit integer, p_offset integer
) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with f as (
    select
      i.id, i.customer_id, i.issue_date, i.due_date, i.amount, i.paid,
      cu.name as customer_name,
      case when i.paid then 'Paid' when i.due_date < p_today then 'Overdue' else 'Outstanding' end as status
    from invoices i
    left join customers cu on cu.id = i.customer_id
    where i.issue_date between p_start and p_end
  ),
  ranked as (
    select f.*, row_number() over (order by
      case when not p_desc then case p_sort when 'client' then f.customer_name when 'status' then f.status end end asc nulls last,
      case when p_desc then case p_sort when 'client' then f.customer_name when 'status' then f.status end end desc nulls last,
      case when not p_desc then case p_sort when 'issueDate' then f.issue_date when 'dueDate' then f.due_date end end asc,
      case when p_desc then case p_sort when 'issueDate' then f.issue_date when 'dueDate' then f.due_date end end desc,
      case when p_sort = 'amount' and not p_desc then f.amount end asc,
      case when p_sort = 'amount' and p_desc then f.amount end desc,
      f.issue_date desc, f.id desc
    ) as rn
    from f
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'outstanding', coalesce((select sum(f.amount) from f where not f.paid), 0),
    'overdue_count', (select count(*) from f where f.status = 'Overdue'),
    'paid', coalesce((select sum(f.amount) from f where f.paid), 0),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(r) - 'rn' order by r.rn)
      from ranked r
      where r.rn > p_offset and r.rn <= p_offset + p_limit
    ), '[]'::jsonb)
  )
$$;

-- One page of orders placed in the range, with their items, payment count and
-- last payment (the Record payment dialog's defaults), plus the range's totals.
create or replace function list_orders(
  p_start date, p_end date,
  p_sort text, p_desc boolean, p_limit integer, p_offset integer
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

-- Each budget with what its category spent in the range.
create or replace function budget_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'category_id', b.category_id,
    'category_name', c.name,
    'target', b.target,
    'actual', coalesce((select sum(t.amount) from transactions t
      where t.category_id = b.category_id and t.date between p_start and p_end), 0)
  ) order by c.name), '[]'::jsonb)
  from budgets b
  join categories c on c.id = b.category_id
$$;

-- Each customer's income in the range and overall, plus all income in the
-- range so the page can show what isn't linked to anyone.
create or replace function customer_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(r.report_amount) from report_transactions r
      where r.type = 'income' and r.date between p_start and p_end), 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'company', c.company, 'email', c.email, 'phone', c.phone,
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

create or replace function category_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.type,
    'txn_count', (select count(*) from transactions t where t.category_id = c.id),
    'budgeted', exists (select 1 from budgets b where b.category_id = c.id)
  ) order by c.name), '[]'::jsonb)
  from categories c
$$;

create or replace function channel_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ch.id,
    'name', ch.name,
    'type', ch.type,
    'txn_count', (select count(*) from transactions t where t.channel_id = ch.id)
  ) order by ch.name), '[]'::jsonb)
  from channels ch
$$;

create or replace function source_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'expense', coalesce((select sum(t.amount) from transactions t
      where t.type = 'expense' and t.date between p_start and p_end), 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'expense_count', (select count(*) from transactions t where t.source_id = s.id),
        'in_range', coalesce((select sum(t.amount) from transactions t
          where t.source_id = s.id and t.date between p_start and p_end), 0)
      ) order by s.name)
      from sources s
    ), '[]'::jsonb)
  )
$$;

create or replace function delivery_provider_summary(p_start date, p_end date) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'orders_without_provider', (select count(*) from orders o
      where o.delivery_provider_id is null and o.order_date between p_start and p_end),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'order_count', (select count(*) from orders o where o.delivery_provider_id = d.id),
        'in_range', coalesce((select sum(o.delivery_charge) from orders o
          where o.delivery_provider_id = d.id and o.order_date between p_start and p_end), 0)
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
      where o.payment_method_id is null and o.order_date between p_start and p_end),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'order_count', (select count(*) from orders o where o.payment_method_id = m.id),
        'in_range', coalesce((select sum(o.total_price) from orders o
          where o.payment_method_id = m.id and o.order_date between p_start and p_end), 0)
      ) order by m.name)
      from payment_methods m
    ), '[]'::jsonb)
  )
$$;

-- Stock totals across every variant, and per product with how many orders use it.
create or replace function product_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'units', coalesce((select sum(v.quantity) from product_variants v), 0),
    'stock_value', coalesce((select sum(v.quantity * v.price) from product_variants v), 0),
    'out_of_stock', (select count(*) from product_variants v where v.quantity = 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'option_names', to_jsonb(p.option_names),
        'variants', coalesce((
          select jsonb_agg(jsonb_build_object('id', v.id, 'options', v.options, 'quantity', v.quantity, 'price', v.price))
          from product_variants v where v.product_id = p.id
        ), '[]'::jsonb),
        'units', coalesce((select sum(v.quantity) from product_variants v where v.product_id = p.id), 0),
        'stock_value', coalesce((select sum(v.quantity * v.price) from product_variants v where v.product_id = p.id), 0),
        'order_count', (
          select count(distinct oi.order_id)
          from order_items oi
          join product_variants v on v.id = oi.variant_id
          where v.product_id = p.id
        )
      ) order by p.name)
      from products p
    ), '[]'::jsonb)
  )
$$;

-- A product's variants that are on an order, which save_product can't remove.
create or replace function variants_in_use(p_product_id text) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(distinct oi.variant_id), '[]'::jsonb)
  from order_items oi
  join product_variants v on v.id = oi.variant_id
  where v.product_id = p_product_id
$$;

-- Only the server (service role) may read these.
revoke all on report_transactions from public, anon, authenticated;
grant select on report_transactions to service_role;

revoke execute on function overview_summary(date, date, date, date, boolean) from public, anon, authenticated;
revoke execute on function list_transactions(date, date, text, text, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function list_invoices(date, date, date, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function list_orders(date, date, text, boolean, integer, integer) from public, anon, authenticated;
revoke execute on function budget_summary(date, date) from public, anon, authenticated;
revoke execute on function customer_summary(date, date) from public, anon, authenticated;
revoke execute on function category_summary() from public, anon, authenticated;
revoke execute on function channel_summary() from public, anon, authenticated;
revoke execute on function source_summary(date, date) from public, anon, authenticated;
revoke execute on function delivery_provider_summary(date, date) from public, anon, authenticated;
revoke execute on function payment_method_summary(date, date) from public, anon, authenticated;
revoke execute on function product_summary() from public, anon, authenticated;
revoke execute on function variants_in_use(text) from public, anon, authenticated;
grant execute on function overview_summary(date, date, date, date, boolean) to service_role;
grant execute on function list_transactions(date, date, text, text, text, boolean, integer, integer) to service_role;
grant execute on function list_invoices(date, date, date, text, boolean, integer, integer) to service_role;
grant execute on function list_orders(date, date, text, boolean, integer, integer) to service_role;
grant execute on function budget_summary(date, date) to service_role;
grant execute on function customer_summary(date, date) to service_role;
grant execute on function category_summary() to service_role;
grant execute on function channel_summary() to service_role;
grant execute on function source_summary(date, date) to service_role;
grant execute on function delivery_provider_summary(date, date) to service_role;
grant execute on function payment_method_summary(date, date) to service_role;
grant execute on function product_summary() to service_role;
grant execute on function variants_in_use(text) to service_role;
