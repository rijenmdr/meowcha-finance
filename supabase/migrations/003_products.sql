-- Adds the products table. Run once in the Supabase SQL editor, before
-- deploying the matching app code.

begin;

create table if not exists products (
  id text primary key,
  name text not null,
  color text not null,
  type text not null check (type in ('lined', 'blank')),
  quantity integer not null default 0 check (quantity >= 0),
  price numeric not null check (price >= 0),
  unique (name, color, type)
);
alter table products enable row level security;

commit;
