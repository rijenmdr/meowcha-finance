-- Brings an orders table created by the first version of 005_orders.sql up to
-- date. That version had a client-typed order_number with no default, and an
-- optional customer_id. Safe to run on a database that already has the current
-- 005: every step is idempotent. Run once, after 006_order_payments.sql.

begin;

-- DB-assigned order numbers.
create sequence if not exists order_number_seq;

create or replace function next_order_number() returns text
language sql
set search_path = public
as $$
  select 'ORD-' || lpad(n::text, greatest(4, length(n::text)), '0')
  from (select nextval('order_number_seq') as n) s
$$;

-- Continue after the highest ORD-#### already in use, so new numbers can't collide.
do $$
declare
  v_used bigint := coalesce((select max(substring(order_number from '^ORD-(\d+)$')::bigint) from orders), 0);
  v_seq bigint := (select case when is_called then last_value else 0 end from order_number_seq);
begin
  if greatest(v_used, v_seq) > 0 then
    perform setval('order_number_seq', greatest(v_used, v_seq), true);
  end if;
end;
$$;

alter table orders alter column order_number set default next_order_number();

-- Once assigned, an order number never changes.
create or replace function keep_order_number() returns trigger
language plpgsql
as $$
begin
  new.order_number := old.order_number;
  return new;
end;
$$;

drop trigger if exists orders_keep_order_number on orders;
create trigger orders_keep_order_number
  before update on orders
  for each row execute function keep_order_number();

-- Every order needs a customer, and a customer with orders can't be deleted.
do $$
begin
  if exists (select 1 from orders where customer_id is null) then
    raise exception 'Some orders have no customer. Assign one to each (or delete them), then run this again.';
  end if;
end;
$$;

alter table orders drop constraint if exists orders_customer_id_fkey;
alter table orders add constraint orders_customer_id_fkey foreign key (customer_id) references customers(id);
alter table orders alter column customer_id set not null;

revoke execute on function next_order_number() from public, anon, authenticated;
grant execute on function next_order_number() to service_role;

commit;
