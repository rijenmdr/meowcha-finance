-- Converts transactions.channel (free text) to a link to the new channels
-- table. Run once in the Supabase SQL editor, before deploying the matching
-- app code. Runs in a transaction, so any failure leaves the database untouched.

begin;

create table if not exists channels (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  unique (type, name),
  unique (id, type)
);
alter table channels enable row level security;

-- One channel per distinct (type, name) in use. Blank channels stay unlinked.
insert into channels (name, type)
  select distinct trim(channel), type from transactions where trim(channel) <> ''
on conflict (type, name) do nothing;

alter table transactions add column channel_id text;
update transactions t
  set channel_id = ch.id
  from channels ch
  where ch.name = trim(t.channel) and ch.type = t.type;
alter table transactions
  add constraint transactions_channel_fkey
  foreign key (channel_id, type) references channels (id, type) on delete set null (channel_id);
alter table transactions drop column channel;

commit;
