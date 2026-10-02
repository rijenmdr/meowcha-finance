-- Converts a database created by the old schema.sql (categories and invoice
-- clients referenced by name) to id-based links. Run once in the Supabase SQL
-- editor, before deploying the matching app code. Runs in a transaction, so
-- any failure leaves the database untouched.

begin;

-- Categories ---------------------------------------------------------------

-- Make sure every name in use has a category row to point at.
insert into categories (name, type)
  select distinct category, type from transactions
  union
  select category, 'expense' from budgets
on conflict (type, name) do nothing;

alter table categories add constraint categories_id_type_key unique (id, type);

alter table transactions add column category_id text;
update transactions t
  set category_id = c.id
  from categories c
  where c.name = t.category and c.type = t.type;
alter table transactions alter column category_id set not null;
alter table transactions
  add constraint transactions_category_fkey
  foreign key (category_id, type) references categories (id, type);
alter table transactions drop column category;

alter table budgets add column category_id text references categories(id);
update budgets b
  set category_id = c.id
  from categories c
  where c.name = b.category and c.type = 'expense';
alter table budgets alter column category_id set not null;
alter table budgets add constraint budgets_category_id_key unique (category_id);
alter table budgets drop column category;

-- Invoices -----------------------------------------------------------------

-- Invoice clients were free text: create a customer for each one that doesn't
-- already match a customer by name. Blank clients are left with no customer.
insert into customers (id, name)
  select gen_random_uuid()::text, i.client
  from (select distinct client from invoices where trim(client) <> '') i
  where not exists (select 1 from customers c where c.name = i.client);

alter table invoices add column customer_id text references customers(id) on delete set null;
update invoices i
  set customer_id = (select c.id from customers c where c.name = i.client order by c.id limit 1)
  where trim(i.client) <> '';
alter table invoices drop column client;

commit;
