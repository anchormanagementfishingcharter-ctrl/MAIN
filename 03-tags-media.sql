-- Run after 02-availability.sql.

-- Which tagged unit is out with which booking. A tag can only be "out" once at a time.
create table if not exists unit_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  item_id text references inventory_items(id),
  tag text not null,
  assigned_at timestamptz default now(),
  returned_at timestamptz
);
create unique index if not exists one_tag_out on unit_assignments (tag) where returned_at is null;

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                 -- cook or howto
  cat text,                           -- cook, hooks, rinse, basics
  title text not null, path text not null,
  created_at timestamptz default now()
);
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  path text not null, name text, caption text,
  consent boolean default false,
  status text default 'uploading',    -- uploading, pending, approved
  ip text, created_at timestamptz default now(), approved_at timestamptz
);
alter table unit_assignments enable row level security;
alter table videos enable row level security;
alter table photos enable row level security;

-- Storage. Supabase enforces the size and file-type limits below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('videos', 'videos', true, 52428800, array['video/mp4','video/quicktime','video/webm']),
 ('photos', 'photos', true, 3145728,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
