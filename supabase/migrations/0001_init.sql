-- ═══════════════════════════════════════════════════════════════
--  CitizenAI · initial schema
--  Run in the Supabase SQL editor (or `supabase db push`).
--  Tables: profiles, trips, stops, favorites, saved_places
--  All user data is protected by row-level security.
-- ═══════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  create type budget_t as enum ('budget', 'moderate', 'premium', 'luxury');
exception when duplicate_object then null; end $$;

do $$ begin
  create type travel_style_t as enum ('solo', 'couple', 'family', 'friends');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transport_t as enum ('walking', 'driving', 'uber', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trip_status_t as enum ('upcoming', 'completed');
exception when duplicate_object then null; end $$;

-- ── profiles ───────────────────────────────────────────────────
-- One row per auth user; created automatically on sign-up.
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  avatar_url        text,
  home_city         text,
  default_budget    budget_t,
  default_style     travel_style_t,
  default_transport transport_t,
  default_interests text[] default '{}',
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── trips ──────────────────────────────────────────────────────
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  summary       text,
  city          text not null,
  trip_date     date not null,
  time_start    text not null,               -- "HH:mm"
  time_end      text not null,
  budget        budget_t not null,
  travel_style  travel_style_t not null,
  transport     transport_t not null,
  interests     text[] not null default '{}',
  est_cost_low  integer,
  est_cost_high integer,
  weather       jsonb,                        -- cached WeatherSummary
  status        trip_status_t not null default 'upcoming',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists trips_user_idx on public.trips (user_id, trip_date desc);

-- ── stops ──────────────────────────────────────────────────────
create table if not exists public.stops (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  ord               integer not null,
  name              text not null,
  category          text,
  description       text,
  arrive_time       text,                     -- "HH:mm"
  duration_min      integer,
  cost_low          integer,
  cost_high         integer,
  is_indoor         boolean default false,
  travel_to_next_min integer,
  travel_mode       transport_t,
  place_id          text,
  address           text,
  lat               double precision,
  lng               double precision,
  rating            numeric(2,1),
  photo_url         text,
  maps_url          text
);
create index if not exists stops_trip_idx on public.stops (trip_id, ord);

-- ── favorites (venues the user loves across trips) ─────────────
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  place_id   text,
  name       text not null,
  category   text,
  city       text,
  photo_url  text,
  address    text,
  maps_url   text,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- ── saved_places (bookmarked to reuse in future plans) ─────────
create table if not exists public.saved_places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  place_id   text,
  name       text not null,
  category   text,
  city       text,
  photo_url  text,
  address    text,
  maps_url   text,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- ═══════════════════════════════════════════════════════════════
--  Row-level security
-- ═══════════════════════════════════════════════════════════════
alter table public.profiles     enable row level security;
alter table public.trips        enable row level security;
alter table public.stops        enable row level security;
alter table public.favorites    enable row level security;
alter table public.saved_places enable row level security;

-- profiles: a user sees & edits only their own row
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- trips: owner-only
drop policy if exists "trips_owner" on public.trips;
create policy "trips_owner" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- stops: accessible when the parent trip belongs to the user
drop policy if exists "stops_owner" on public.stops;
create policy "stops_owner" on public.stops
  for all using (
    exists (select 1 from public.trips t
            where t.id = stops.trip_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.trips t
            where t.id = stops.trip_id and t.user_id = auth.uid())
  );

-- favorites & saved_places: owner-only
drop policy if exists "favorites_owner" on public.favorites;
create policy "favorites_owner" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_places_owner" on public.saved_places;
create policy "saved_places_owner" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
--  Auto-create a profile row when a new auth user signs up
-- ═══════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
