-- Product categories: every product belongs to exactly one. Products saved
-- before categories existed are all journals, so they're filed under a
-- "Journal" category (an ordinary one: it can be renamed, or deleted once
-- no product uses it).

create table if not exists product_categories (
  id text primary key default gen_random_uuid()::text,
  name text not null
);
create unique index if not exists product_categories_name_key on product_categories (lower(btrim(name)));
alter table product_categories enable row level security;

insert into product_categories (name)
select 'Journal'
where not exists (select 1 from product_categories where lower(btrim(name)) = 'journal');

alter table products add column if not exists category_id text references product_categories(id) on delete restrict;
update products
set category_id = (select id from product_categories where lower(btrim(name)) = 'journal')
where category_id is null;
alter table products alter column category_id set not null;
create index if not exists products_category_id_idx on products (category_id);

create or replace function save_product(p_product jsonb, p_variants jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id text := p_product->>'id';
begin
  insert into products (id, name, category_id, option_names)
  values (
    v_id,
    p_product->>'name',
    p_product->>'category_id',
    array(select jsonb_array_elements_text(p_product->'option_names'))
  )
  on conflict (id) do update set
    name = excluded.name,
    category_id = excluded.category_id,
    option_names = excluded.option_names;

  delete from product_variants
  where product_id = v_id
    and id not in (select x->>'id' from jsonb_array_elements(p_variants) x);

  insert into product_variants (id, product_id, options, quantity, price)
  select x->>'id', v_id, x->'options', (x->>'quantity')::integer, (x->>'price')::numeric
  from jsonb_array_elements(p_variants) x
  on conflict (id) do update set
    options = excluded.options,
    quantity = excluded.quantity,
    price = excluded.price
  where product_variants.product_id = v_id;
end;
$$;

-- Gains a category filter, which narrows the stock totals as well as the rows.
drop function if exists product_summary();
create or replace function product_summary(p_category_id text default null) returns jsonb
language sql stable security invoker
set search_path = public
as $$
  with fp as (
    select p.* from products p where p_category_id is null or p.category_id = p_category_id
  ), fv as (
    select v.* from product_variants v join fp on fp.id = v.product_id
  )
  select jsonb_build_object(
    'units', coalesce((select sum(fv.quantity) from fv), 0),
    'stock_value', coalesce((select sum(fv.quantity * fv.price) from fv), 0),
    'out_of_stock', (select count(*) from fv where fv.quantity = 0),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category_id', p.category_id,
        'category_name', c.name,
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
      from fp p
      join product_categories c on c.id = p.category_id
    ), '[]'::jsonb)
  )
$$;

-- Each product category with how many products it holds.
create or replace function product_category_summary() returns jsonb
language sql stable security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'product_count', (select count(*) from products p where p.category_id = c.id)
  ) order by c.name), '[]'::jsonb)
  from product_categories c
$$;

revoke execute on function product_summary(text) from public, anon, authenticated;
revoke execute on function product_category_summary() from public, anon, authenticated;
grant execute on function product_summary(text) to service_role;
grant execute on function product_category_summary() to service_role;
