-- Adds optional, expense-only sources to transactions. Existing transactions
-- remain unlinked until an admin assigns a source.

begin;

create table if not exists sources (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  type text not null default 'expense' check (type = 'expense'),
  unique (id, type)
);
alter table sources enable row level security;

alter table transactions add column source_id text;
alter table transactions
  add constraint transactions_source_fkey
  foreign key (source_id, type) references sources (id, type) on delete set null (source_id);

commit;