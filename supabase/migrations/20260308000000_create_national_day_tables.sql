create extension if not exists pgcrypto;

create table public.national_day_sites (
  site_id text primary key,
  vendor text,
  region text,
  area text,
  location_name text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.national_day_power_alarms (
  id uuid primary key default gen_random_uuid(),
  tt_number text unique not null,
  site_id text not null references public.national_day_sites(site_id),
  start_at timestamptz,
  end_at timestamptz,
  problem_description text,
  action_taken text,
  issue text,
  fo_staff text,
  assigned_at timestamptz,
  comments text,
  owner_responsible text,
  status text,
  power_source text,
  vendor text,
  chain text,
  tt_severity text,
  site_label text,
  subcon text,
  region text,
  district text,
  duration_min numeric,
  summary text,
  source_row_number integer,
  source_updated_at timestamptz,
  synced_at timestamptz,
  is_active boolean not null default true
);

create table public.national_day_outages (
  id uuid primary key default gen_random_uuid(),
  tt_number text unique not null,
  site_id text not null references public.national_day_sites(site_id),
  technology text,
  oos_start_at timestamptz,
  oos_end_at timestamptz,
  alarms_description text,
  fo_staff text,
  action_taken text,
  assigned_at timestamptz,
  fault_type text,
  without_alarms_feedback text,
  comment text,
  power_alarm_at timestamptz,
  referring_at timestamptz,
  status text,
  power_source text,
  vendor text,
  chain text,
  tt_severity text,
  site_label text,
  region text,
  subcon text,
  area text,
  physical_impacted_sites integer,
  sites_2g text,
  sites_4g text,
  sites_5g text,
  battery_status text,
  owner text,
  duration_min numeric,
  summary text,
  source_row_number integer,
  source_updated_at timestamptz,
  synced_at timestamptz,
  is_active boolean not null default true
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

create table public.national_day_sync_runs (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz not null default now(),
  status text not null,
  power_source_rows integer not null default 0,
  outage_source_rows integer not null default 0,
  power_upserted integer not null default 0,
  outages_upserted integer not null default 0,
  power_skipped integer not null default 0,
  outages_skipped integer not null default 0,
  power_deactivated integer not null default 0,
  outages_deactivated integer not null default 0
);

create index national_day_sync_runs_synced_at_idx
  on public.national_day_sync_runs (synced_at desc);

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

alter table public.national_day_sites enable row level security;
alter table public.national_day_power_alarms enable row level security;
alter table public.national_day_outages enable row level security;
alter table public.national_day_sync_runs enable row level security;

create policy "Authenticated users can read national day sync runs"
  on public.national_day_sync_runs for select to authenticated using (true);
create policy "Authenticated users can read national day sites"
  on public.national_day_sites for select to authenticated using (true);
create policy "Authenticated users can read national day power alarms"
  on public.national_day_power_alarms for select to authenticated using (true);
create policy "Authenticated users can read national day outages"
  on public.national_day_outages for select to authenticated using (true);

insert into public.national_day_sites
  (site_id, vendor, region, area, location_name, latitude, longitude)
values
  ('CWH935', 'Huawei', 'South', 'Najran', 'King Saud Park', 17.561834, 44.229176),
  ('CWH942', 'Huawei', 'West', 'Tabuk', 'Tabuk Central Park', 28.388581, 36.516846),
  ('CWH352', 'Huawei', 'East', 'Khobar', 'Fouad Centre', 26.295376, 50.222534),
  ('COW652', 'Huawei', 'East', 'Khobar', 'Water Tank', 26.312552, 50.228211),
  ('CWH353', 'Huawei', 'East', 'Khobar', 'Rakkah Corniche', 26.383762, 50.234955),
  ('CWH937', 'Huawei', 'East', 'Ahsa', 'King Abdullah Park', 25.321185, 49.558260),
  ('CWH943', 'Huawei', 'Central', 'Hail', 'Al Maqwat Park', 27.566307, 41.654743),
  ('CWH973', 'Huawei', 'Central', 'Hail', 'Salam Park', 27.543970, 41.665162),
  ('COW847', 'Ericsson', 'Central', 'Riyadh', 'Um Al Ajlan Park', 24.851387, 46.582722),
  ('CWH944', 'Huawei', 'Central', 'Buraydah', 'Ash Shihyah', 26.251463, 43.607390),
  ('COW522', 'Ericsson', 'West', 'Jeddah', 'Red Sea Mall Event', 21.632690, 39.115680),
  ('CWN109', 'Nokia', 'South', 'Baha', 'Garden and Walkway Khiash', 19.882371, 41.569209),
  ('CWH037', 'Huawei', 'South', 'Jizan', 'Jizan Corniche – Winter Festival', 16.823637, 42.624947),
  ('CWN917', 'Nokia', 'South', 'Assir', 'Assir', 18.252310, 42.502590),
  ('CWN052', 'Nokia', 'South', 'Assir', 'Assir', 18.262310, 42.492180),
  ('CWH009', 'Huawei', 'South', 'Jizan', 'Prince Sultan Cultural Centre', 16.913747, 42.549721),
  ('CWN213', 'Nokia', 'South', 'Baha', 'Summer Season 2026, Raghadan Park', 20.022349, 41.434442),
  ('CWS810', 'Huawei', 'West', 'Tabuk', 'Prince Fahad bin Sultan Park', 28.432700, 36.575500),
  ('CWH316', 'Huawei', 'East', 'Jubail', 'Hay Al Telal – Hafer Al Baten', 28.436700, 45.919040),
  ('CWS814', 'Huawei', 'East', 'Jubail', 'Afar Al Baten', 28.445640, 45.982810),
  ('COW527', 'Huawei', 'East', 'Northern Border', 'Al Uwayqilah Village – Ookla', 30.355570, 42.241410),
  ('COW054', 'Ericsson', 'Central', 'Riyadh', 'City Replacement of ZRI737 in KACST', 24.718905, 46.644098),
  ('COW735', 'Ericsson', 'Central', 'Riyadh', 'Dariya Season 2025', 24.734923, 46.577447),
  ('COW019', 'Ericsson', 'Central', 'Riyadh', 'Dariya Season 2025', 24.738001, 46.574318);
