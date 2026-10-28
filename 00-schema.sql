-- Run FIRST in the Supabase SQL editor (then 01-database.sql).
-- Tables for the live reservation system, starting data copied from your admin dashboard preview.

create table if not exists products (
  id text primary key, name text not null,
  daily_cents int not null, weekly_cents int not null,
  is_addon boolean default false, active boolean default true, sort int default 0
);
create table if not exists inventory_items (
  id text primary key, name text not null, prefix text not null, qty int not null default 0
);
create table if not exists product_parts (          -- what each package pulls from inventory
  product_id text references products(id) on delete cascade,
  item_id text references inventory_items(id) on delete restrict,
  qty int not null check (qty > 0),
  primary key (product_id, item_id)
);
create table if not exists delivery_zones (city text primary key, fee_cents int not null, active boolean default true);
create table if not exists bait_items (
  id text primary key, name text not null, price_cents int not null,
  unit text, good_for text, available boolean default true
);
create table if not exists customers (
  id uuid primary key default gen_random_uuid(), name text, email text unique, phone text
);
create table if not exists settings (
  key text primary key, value jsonb not null, updated_at timestamptz default now()
);
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  start_date date not null, end_date date not null,
  status text default 'pending',                    -- pending, confirmed, expired, cancelled
  expires_at timestamptz,                           -- unpaid bookings stop holding stock after this
  created_at timestamptz default now(),
  delivery_city text, delivery_address text, bait jsonb,
  subtotal_cents int, delivery_fee_cents int, bait_cents int, deposit_cents int,
  stripe_customer_id text, stripe_session_id text, payment_method_id text,
  deposit_status text default 'none',               -- none, scheduled, held, released, captured, failed
  deposit_pi_id text, deposit_held_at timestamptz
);
create table if not exists booking_items (
  booking_id uuid references bookings(id) on delete cascade,
  product_id text references products(id), qty int not null default 1,
  primary key (booking_id, product_id)
);
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  terms_version text, signer_name text, pdf_path text,
  signed_at timestamptz default now(), ip text, user_agent text
);
alter table products enable row level security;        alter table inventory_items enable row level security;
alter table product_parts enable row level security;   alter table delivery_zones enable row level security;
alter table bait_items enable row level security;      alter table customers enable row level security;
alter table settings enable row level security;        alter table bookings enable row level security;
alter table booking_items enable row level security;   alter table contracts enable row level security;

insert into storage.buckets (id, name, public) values ('contracts', 'contracts', false) on conflict do nothing;

-- ---------- Starting data (placeholders from the preview; edit to match your real business) ----------
insert into products (id, name, daily_cents, weekly_cents, is_addon, sort) values
 ('surf','Surf fishing',4000,20000,false,1), ('kids','Kids fishing',2500,12500,false,2),
 ('family','Family fishing',8000,40000,false,3), ('prem','Premium',6000,30000,false,4),
 ('ult','Ultimate',10000,50000,false,5), ('cartx','Beach fishing cart',1500,7500,true,6)
on conflict do nothing;
insert into inventory_items (id, name, prefix, qty) values
 ('combo','Rod & reel combo','RR',10), ('kidcombo','Kids rod & reel combo','KRR',4),
 ('holder','Rod holder','RH',8), ('tackle','Basic tackle kit','TK',12),
 ('tbox','Tackle box','TB',3), ('cart','Beach fishing cart','CART',2)
on conflict do nothing;
insert into product_parts (product_id, item_id, qty) values
 ('surf','combo',1),('surf','holder',1),('surf','tackle',1),
 ('kids','kidcombo',1),('kids','tackle',1),
 ('family','combo',4),('family','holder',2),('family','tackle',2),
 ('prem','combo',1),('prem','holder',1),('prem','tackle',1),('prem','tbox',1),
 ('ult','combo',4),('ult','holder',2),('ult','tackle',2),('ult','tbox',1),
 ('cartx','cart',1)
on conflict do nothing;
insert into delivery_zones (city, fee_cents) values
 ('Destin',2500),('Miramar Beach',3500),('Fort Walton Beach',4500),('30A / Santa Rosa Beach',5500)
on conflict do nothing;
insert into bait_items (id, name, price_cents, unit, good_for) values
 ('ls','Live shrimp',1200,'per dozen','Pompano, redfish, flounder, sheepshead, whiting'),
 ('ds','Fresh dead shrimp',800,'per half pound','Whiting, pompano, croaker, pinfish'),
 ('sf','Sand fleas',1000,'per dozen','Pompano and sheepshead'),
 ('sq','Cut squid',600,'per pack','Whiting, jacks, sheepshead'),
 ('cb','Cigar minnows & cut bait',700,'per pack','Redfish, Spanish mackerel, kingfish, sharks')
on conflict do nothing;
insert into settings (key, value) values ('rental', '{"deposit_cents": 10000, "max_days": 7}') on conflict do nothing;

-- ---------- Overbooking protection ----------
-- Checks stock for every date in the range and creates the booking in ONE locked step,
-- so two customers can never grab the last set of gear at the same moment.
create or replace function reserve_booking(
  p_customer uuid, p_start date, p_end date, p_items jsonb, p_data jsonb
) returns uuid language plpgsql as $$
declare v_id uuid; r record;
begin
  if p_end < p_start then raise exception 'BAD_DATES'; end if;
  perform pg_advisory_xact_lock(hashtext('reserve_booking'));
  for r in
    select ii.id, ii.name, ii.qty as stock, sum((x->>'qty')::int * pp.qty) as need
    from jsonb_array_elements(p_items) x
    join product_parts pp on pp.product_id = x->>'product_id'
    join inventory_items ii on ii.id = pp.item_id
    group by ii.id, ii.name, ii.qty
  loop
    if r.stock - coalesce((
      select sum(bi.qty * pp2.qty)
      from bookings b
      join booking_items bi on bi.booking_id = b.id
      join product_parts pp2 on pp2.product_id = bi.product_id and pp2.item_id = r.id
      where b.start_date <= p_end and b.end_date >= p_start
        and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
    ), 0) < r.need then
      raise exception 'SOLD_OUT:%', r.name;
    end if;
  end loop;

  insert into bookings (customer_id, start_date, end_date, status, expires_at,
    delivery_city, delivery_address, bait, subtotal_cents, delivery_fee_cents, bait_cents, deposit_cents)
  values (p_customer, p_start, p_end, 'pending', now() + interval '35 minutes',
    p_data->>'city', p_data->>'address', p_data->'bait',
    (p_data->>'subtotal')::int, (p_data->>'delivery')::int, (p_data->>'baitCents')::int, (p_data->>'deposit')::int)
  returning id into v_id;

  insert into booking_items (booking_id, product_id, qty)
  select v_id, x->>'product_id', (x->>'qty')::int from jsonb_array_elements(p_items) x;
  return v_id;
end $$;
