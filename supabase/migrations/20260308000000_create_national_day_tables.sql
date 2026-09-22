create extension if not exists pgcrypto;

create table public.national_day_sites (
  id uuid primary key default gen_random_uuid(),
  site_id text not null unique,
  city text not null,
  venue text,
  latitude double precision not null,
  longitude double precision not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.national_day_power_alarms (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.national_day_sites(site_id),
  tt_number text not null unique,
  alarm text,
  status text not null default 'ACTIVE',
  start_at timestamptz,
  end_at timestamptz,
  tt_severity text,
  source_updated_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.national_day_outages (
  id uuid primary key default gen_random_uuid(),
  site_id text not null,
  tt_number text not null unique,
  outage_type text,
  status text not null default 'ACTIVE',
  oos_start_at timestamptz,
  oos_end_at timestamptz,
  tt_severity text,
  source_updated_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index national_day_sites_site_id_idx
  on public.national_day_sites (site_id);
create index national_day_power_alarms_site_id_idx
  on public.national_day_power_alarms (site_id);
create index national_day_power_alarms_tt_number_idx
  on public.national_day_power_alarms (tt_number);
create index national_day_power_alarms_status_idx
  on public.national_day_power_alarms (status);
create index national_day_power_alarms_start_at_idx
  on public.national_day_power_alarms (start_at);
create index national_day_power_alarms_tt_severity_idx
  on public.national_day_power_alarms (tt_severity);
create index national_day_outages_site_id_idx
  on public.national_day_outages (site_id);
create index national_day_outages_tt_number_idx
  on public.national_day_outages (tt_number);
create index national_day_outages_status_idx
  on public.national_day_outages (status);
create index national_day_outages_oos_start_at_idx
  on public.national_day_outages (oos_start_at);
create index national_day_outages_tt_severity_idx
  on public.national_day_outages (tt_severity);

create or replace function public.national_day_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger national_day_sites_set_updated_at
before update on public.national_day_sites
for each row execute function public.national_day_set_updated_at();

create trigger national_day_power_alarms_set_updated_at
before update on public.national_day_power_alarms
for each row execute function public.national_day_set_updated_at();

create trigger national_day_outages_set_updated_at
before update on public.national_day_outages
for each row execute function public.national_day_set_updated_at();

alter table public.national_day_sites enable row level security;
alter table public.national_day_power_alarms enable row level security;
alter table public.national_day_outages enable row level security;

create policy "Authenticated users can read national day sites"
  on public.national_day_sites for select to authenticated using (true);
create policy "Authenticated users can read national day power alarms"
  on public.national_day_power_alarms for select to authenticated using (true);
create policy "Authenticated users can read national day outages"
  on public.national_day_outages for select to authenticated using (true);

insert into public.national_day_sites (site_id, city, venue, latitude, longitude)
values
  ('COW-ND001', 'Riyadh', 'Celebration Zone', 24.7136, 46.6753),
  ('COW-ND002', 'Jeddah', 'Public Park', 21.5433, 39.1728),
  ('COW-ND003', 'Dammam', 'Event Corridor', 26.4207, 50.0888),
  ('COW-ND004', 'Makkah', 'Celebration Zone', 21.3891, 39.8579),
  ('COW-ND005', 'Madinah', 'Public Park', 24.5247, 39.5692),
  ('COW-ND006', 'Abha', 'Event Corridor', 18.2164, 42.5053),
  ('COW-ND007', 'Riyadh', 'Celebration Zone', 24.7743, 46.7386),
  ('COW-ND008', 'Jeddah', 'Public Park', 21.5977, 39.1607),
  ('COW-ND009', 'Dammam', 'Event Corridor', 26.3927, 49.9777),
  ('COW-ND010', 'Makkah', 'Celebration Zone', 21.4225, 39.8262),
  ('COW-ND011', 'Madinah', 'Public Park', 24.4686, 39.6142),
  ('COW-ND012', 'Abha', 'Event Corridor', 18.2386, 42.5500),
  ('COW-ND013', 'Riyadh', 'Celebration Zone', 24.6877, 46.7219),
  ('COW-ND014', 'Jeddah', 'Public Park', 21.4858, 39.1925),
  ('COW-ND015', 'Dammam', 'Event Corridor', 26.4550, 50.1033),
  ('COW-ND016', 'Makkah', 'Celebration Zone', 21.3557, 39.8342),
  ('COW-ND017', 'Madinah', 'Public Park', 24.5534, 39.6048),
  ('COW-ND018', 'Abha', 'Event Corridor', 18.2070, 42.5009),
  ('COW-ND019', 'Riyadh', 'Celebration Zone', 24.6325, 46.7167),
  ('COW-ND020', 'Jeddah', 'Public Park', 21.6169, 39.1543),
  ('COW-ND021', 'Dammam', 'Event Corridor', 26.4282, 50.0985),
  ('COW-ND022', 'Makkah', 'Celebration Zone', 21.4025, 39.8570),
  ('COW-ND023', 'Madinah', 'Public Park', 24.5012, 39.6113),
  ('COW-ND024', 'Abha', 'Event Corridor', 18.2456, 42.5060);
