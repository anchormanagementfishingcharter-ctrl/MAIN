-- Run once in the Supabase SQL editor.

alter table bookings
  add column if not exists status text default 'pending',
  add column if not exists stripe_session_id text,
  add column if not exists paid_cents int,
  add column if not exists delivery_city text,
  add column if not exists delivery_address text,
  add column if not exists bait jsonb,
  add column if not exists confirmed_at timestamptz,
  add column if not exists viewed_at timestamptz,          -- null = new, owner has not opened it
  add column if not exists email_alert_sent boolean default false,
  add column if not exists sms_alert_sent boolean default false,
  add column if not exists receipt_sent boolean default false,
  add column if not exists alert_attempts int default 0;

-- Owner alert settings. Change the phone or email later from /admin/settings.
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

insert into settings (key, value) values (
  'alerts',
  '{"phones": ["+18503629295"], "emails": ["anchormanagementfishingcharter@gmail.com"]}'
) on conflict (key) do nothing;

-- Lock the tables: no public access. Only the server (service role key) reads them.
alter table settings enable row level security;
alter table bookings enable row level security;
