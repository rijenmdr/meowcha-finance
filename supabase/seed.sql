-- Optional: seeds the same demo data the app used to ship as in-memory
-- mock data, so the dashboard isn't empty after connecting Supabase.
-- Run after schema.sql, in the Supabase SQL editor.

insert into transactions (id, date, type, category_id, description, amount, channel_id)
select v.id, v.date::date, v.type, c.id, v.description, v.amount, ch.id
from (values
  ('t0', '2026-01-05', 'income', 'Etsy Sales', 'Etsy shop orders (14)', 612, 'Etsy'),
  ('t1', '2026-01-08', 'expense', 'Studio Rent', 'January studio rent', 850, ''),
  ('t2', '2026-01-10', 'expense', 'Leather & Materials', 'Vegetable-tanned leather hides', 340, 'Tandy Leather'),
  ('t3', '2026-01-12', 'income', 'Website Sales', 'Website checkout orders (6)', 298, 'Shopify'),
  ('t4', '2026-01-15', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 74, ''),
  ('t5', '2026-01-18', 'expense', 'Shipping Postage', 'USPS Priority batch', 96, 'USPS'),
  ('t6', '2026-01-22', 'income', 'Wholesale Orders', 'Order - Paper & Pine Boutique', 640, 'Wholesale'),
  ('t7', '2026-01-26', 'expense', 'Marketing & Ads', 'Instagram ad campaign', 120, 'Meta Ads'),
  ('t8', '2026-01-29', 'income', 'Etsy Sales', 'Etsy shop orders (11)', 481, 'Etsy'),
  ('t9', '2026-02-03', 'income', 'Etsy Sales', 'Etsy shop orders (16)', 704, 'Etsy'),
  ('t10', '2026-02-07', 'expense', 'Studio Rent', 'February studio rent', 850, ''),
  ('t11', '2026-02-09', 'expense', 'Paper Stock', 'Cotton rag text block paper', 210, 'Legion Paper'),
  ('t12', '2026-02-13', 'income', 'Website Sales', 'Website checkout orders (5)', 245, 'Shopify'),
  ('t13', '2026-02-14', 'income', 'Custom Commissions', 'Wedding guestbook commission', 380, 'Custom'),
  ('t14', '2026-02-16', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 81, ''),
  ('t15', '2026-02-20', 'expense', 'Packaging & Supplies', 'Kraft boxes + tissue paper', 145, 'Uline'),
  ('t16', '2026-02-24', 'expense', 'Contract Labor', 'Freelance bookbinding assistant', 400, ''),
  ('t17', '2026-02-27', 'income', 'Etsy Sales', 'Etsy shop orders (13)', 559, 'Etsy'),
  ('t18', '2026-03-02', 'income', 'Etsy Sales', 'Etsy shop orders (18)', 812, 'Etsy'),
  ('t19', '2026-03-06', 'expense', 'Studio Rent', 'March studio rent', 850, ''),
  ('t20', '2026-03-09', 'expense', 'Leather & Materials', 'Chrome-tanned leather + brass hardware', 465, 'Tandy Leather'),
  ('t21', '2026-03-12', 'income', 'Website Sales', 'Website checkout orders (8)', 396, 'Shopify'),
  ('t22', '2026-03-15', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 88, ''),
  ('t23', '2026-03-18', 'income', 'Wholesale Orders', 'Order - Willow & Ink Stationers', 920, 'Wholesale'),
  ('t24', '2026-03-21', 'expense', 'Shipping Postage', 'USPS Priority batch', 112, 'USPS'),
  ('t25', '2026-03-25', 'expense', 'Equipment & Tools', 'Replacement board shear blade', 260, ''),
  ('t26', '2026-03-28', 'income', 'Etsy Sales', 'Etsy shop orders (15)', 660, 'Etsy'),
  ('t27', '2026-04-01', 'expense', 'Studio Rent', 'April studio rent', 850, ''),
  ('t28', '2026-04-04', 'income', 'Etsy Sales', 'Etsy shop orders (20)', 890, 'Etsy'),
  ('t29', '2026-04-08', 'expense', 'Paper Stock', 'Cotton rag text block paper', 230, 'Legion Paper'),
  ('t30', '2026-04-10', 'income', 'Craft Fair Sales', 'Spring Maker''s Market', 745, 'Craft Fair'),
  ('t31', '2026-04-13', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 92, ''),
  ('t32', '2026-04-16', 'income', 'Website Sales', 'Website checkout orders (7)', 351, 'Shopify'),
  ('t33', '2026-04-19', 'expense', 'Marketing & Ads', 'Pinterest + IG ads', 150, 'Meta Ads'),
  ('t34', '2026-04-23', 'expense', 'Packaging & Supplies', 'Kraft boxes + tissue paper', 138, 'Uline'),
  ('t35', '2026-04-27', 'income', 'Etsy Sales', 'Etsy shop orders (17)', 748, 'Etsy'),
  ('t36', '2026-05-01', 'expense', 'Studio Rent', 'May studio rent', 850, ''),
  ('t37', '2026-05-04', 'income', 'Etsy Sales', 'Etsy shop orders (19)', 836, 'Etsy'),
  ('t38', '2026-05-07', 'expense', 'Leather & Materials', 'Vegetable-tanned leather hides', 355, 'Tandy Leather'),
  ('t39', '2026-05-11', 'income', 'Wholesale Orders', 'Order - Paper & Pine Boutique', 705, 'Wholesale'),
  ('t40', '2026-05-14', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 85, ''),
  ('t41', '2026-05-17', 'income', 'Website Sales', 'Website checkout orders (6)', 312, 'Shopify'),
  ('t42', '2026-05-21', 'expense', 'Contract Labor', 'Freelance bookbinding assistant', 420, ''),
  ('t43', '2026-05-24', 'expense', 'Shipping Postage', 'USPS Priority batch', 104, 'USPS'),
  ('t44', '2026-05-29', 'income', 'Custom Commissions', 'Anniversary journal set', 260, 'Custom'),
  ('t45', '2026-06-02', 'expense', 'Studio Rent', 'June studio rent', 850, ''),
  ('t46', '2026-06-05', 'income', 'Etsy Sales', 'Etsy shop orders (21)', 924, 'Etsy'),
  ('t47', '2026-06-08', 'expense', 'Paper Stock', 'Cotton rag + endpaper stock', 245, 'Legion Paper'),
  ('t48', '2026-06-12', 'income', 'Website Sales', 'Website checkout orders (9)', 418, 'Shopify'),
  ('t49', '2026-06-15', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 97, ''),
  ('t50', '2026-06-18', 'expense', 'Software & Subscriptions', 'Design + shop software renewals', 68, ''),
  ('t51', '2026-06-21', 'income', 'Craft Fair Sales', 'Summer Riverside Market', 690, 'Craft Fair'),
  ('t52', '2026-06-25', 'expense', 'Marketing & Ads', 'Instagram ad campaign', 135, 'Meta Ads'),
  ('t53', '2026-06-28', 'income', 'Etsy Sales', 'Etsy shop orders (16)', 704, 'Etsy'),
  ('t54', '2026-07-01', 'expense', 'Studio Rent', 'July studio rent', 850, ''),
  ('t55', '2026-07-04', 'income', 'Etsy Sales', 'Etsy shop orders (14)', 616, 'Etsy'),
  ('t56', '2026-07-08', 'expense', 'Leather & Materials', 'Chrome-tanned leather + brass hardware', 410, 'Tandy Leather'),
  ('t57', '2026-07-11', 'income', 'Wholesale Orders', 'Order - Willow & Ink Stationers', 880, 'Wholesale'),
  ('t58', '2026-07-14', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 79, ''),
  ('t59', '2026-07-17', 'expense', 'Packaging & Supplies', 'Kraft boxes + tissue paper', 152, 'Uline'),
  ('t60', '2026-07-21', 'income', 'Website Sales', 'Website checkout orders (5)', 275, 'Shopify'),
  ('t61', '2026-07-24', 'expense', 'Equipment & Tools', 'Corner rounder replacement', 175, ''),
  ('t62', '2026-07-29', 'income', 'Etsy Sales', 'Etsy shop orders (18)', 792, 'Etsy'),
  ('t63', '2026-08-01', 'expense', 'Studio Rent', 'August studio rent', 850, ''),
  ('t64', '2026-08-04', 'income', 'Etsy Sales', 'Etsy shop orders (22)', 968, 'Etsy'),
  ('t65', '2026-08-07', 'expense', 'Paper Stock', 'Cotton rag text block paper', 225, 'Legion Paper'),
  ('t66', '2026-08-10', 'income', 'Custom Commissions', 'Retirement memory book', 320, 'Custom'),
  ('t67', '2026-08-13', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 101, ''),
  ('t68', '2026-08-16', 'income', 'Website Sales', 'Website checkout orders (8)', 384, 'Shopify'),
  ('t69', '2026-08-19', 'expense', 'Contract Labor', 'Freelance bookbinding assistant', 440, ''),
  ('t70', '2026-08-23', 'expense', 'Shipping Postage', 'USPS Priority batch', 118, 'USPS'),
  ('t71', '2026-08-27', 'income', 'Etsy Sales', 'Etsy shop orders (20)', 880, 'Etsy'),
  ('t72', '2026-09-01', 'expense', 'Studio Rent', 'September studio rent', 850, ''),
  ('t73', '2026-09-03', 'income', 'Etsy Sales', 'Etsy shop orders (12)', 528, 'Etsy'),
  ('t74', '2026-09-06', 'expense', 'Leather & Materials', 'Vegetable-tanned leather hides', 320, 'Tandy Leather'),
  ('t75', '2026-09-09', 'income', 'Wholesale Orders', 'Order - Paper & Pine Boutique', 760, 'Wholesale'),
  ('t76', '2026-09-11', 'expense', 'Platform & Payment Fees', 'Etsy + Stripe fees', 62, ''),
  ('t77', '2026-09-14', 'income', 'Website Sales', 'Website checkout orders (4)', 198, 'Shopify')
) as v (id, date, type, category, description, amount, channel)
join categories c on c.name = v.category and c.type = v.type
left join channels ch on ch.name = v.channel and ch.type = v.type
on conflict (id) do nothing;

insert into budgets (id, category_id, target)
select v.id, c.id, v.target
from (values
  ('b0', 'Studio Rent', 850),
  ('b1', 'Leather & Materials', 400),
  ('b2', 'Paper Stock', 230),
  ('b3', 'Packaging & Supplies', 150),
  ('b4', 'Shipping Postage', 110),
  ('b5', 'Platform & Payment Fees', 90),
  ('b6', 'Marketing & Ads', 150),
  ('b7', 'Equipment & Tools', 150),
  ('b8', 'Contract Labor', 400),
  ('b9', 'Software & Subscriptions', 70)
) as v (id, category, target)
join categories c on c.name = v.category and c.type = 'expense'
on conflict (id) do nothing;

insert into customers (id, name) values
  ('c0', 'Paper & Pine Boutique'),
  ('c1', 'Willow & Ink Stationers'),
  ('c2', 'Thistle & Bloom Stationery'),
  ('c3', 'R. Alvarez — wedding guestbook'),
  ('c4', 'M. Chen — anniversary set'),
  ('c5', 'Retirement memory book')
on conflict (id) do nothing;

insert into invoices (id, customer_id, issue_date, due_date, amount, paid) values
  ('i0', 'c0', '2026-08-20', '2026-09-19', 760, false),
  ('i1', 'c1', '2026-07-11', '2026-08-10', 880, true),
  ('i2', 'c0', '2026-05-11', '2026-06-10', 705, true),
  ('i3', 'c1', '2026-03-18', '2026-04-17', 920, true),
  ('i4', 'c2', '2026-08-28', '2026-09-12', 540, false),
  ('i5', 'c3', '2026-02-14', '2026-02-28', 380, true),
  ('i6', 'c4', '2026-05-29', '2026-06-12', 260, true),
  ('i7', 'c5', '2026-08-10', '2026-09-24', 320, false)
on conflict (id) do nothing;

insert into products (id, name, option_names) values
  ('pr0', 'A5 Notebook', array['Color', 'Type']),
  ('pr1', 'Pocket Journal', array['Color', 'Type'])
on conflict (id) do nothing;

insert into product_variants (id, product_id, options, quantity, price) values
  ('p0', 'pr0', '{"Color": "Olive", "Type": "Lined"}', 24, 850),
  ('p1', 'pr0', '{"Color": "Olive", "Type": "Blank"}', 18, 800),
  ('p2', 'pr0', '{"Color": "Black", "Type": "Lined"}', 30, 900),
  ('p3', 'pr0', '{"Color": "Black", "Type": "Blank"}', 12, 850),
  ('p4', 'pr1', '{"Color": "Tan", "Type": "Lined"}', 40, 450),
  ('p5', 'pr1', '{"Color": "Tan", "Type": "Blank"}', 35, 420)
on conflict (id) do nothing;

-- Through save_order() so each order's sub_total matches its items, it gets a
-- DB-assigned order number, and its payment is recorded as an income
-- transaction (which sets amount_paid).
select save_order(
  v.o::jsonb,
  v.i::jsonb,
  jsonb_build_object('id', v.pay_id, 'date', (v.o::jsonb)->>'order_date', 'amount', v.paid, 'category_id', c.id, 'channel_id', null)
)
from (values
  ('{"id":"o0","customer_id":"c0","order_date":"2026-08-04","order_status":"delivered","delivery_charge":150}',
   '[{"id":"oi0","variant_id":"p0","quantity":4,"sub_total":3400},{"id":"oi1","variant_id":"p4","quantity":5,"sub_total":2250}]',
   'op0', 5800),
  ('{"id":"o1","customer_id":"c1","order_date":"2026-08-27","order_status":"out_for_delivery","delivery_charge":200}',
   '[{"id":"oi2","variant_id":"p2","quantity":3,"sub_total":2700},{"id":"oi3","variant_id":"p3","quantity":2,"sub_total":1700}]',
   'op1', 2000),
  ('{"id":"o2","customer_id":"c3","order_date":"2026-09-10","order_status":"processing","delivery_charge":0}',
   '[{"id":"oi4","variant_id":"p1","quantity":2,"sub_total":1600}]',
   'op2', 800)
) as v(o, i, pay_id, paid)
cross join (select id from categories where type = 'income' and name = 'Order Sales') c
where not exists (select 1 from orders where orders.id = (v.o::jsonb)->>'id');
