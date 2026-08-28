-- ═══════════════════════════════════════════════════════════════
--  CitizenAI · admin + usage telemetry
--  Run in the Supabase SQL editor after 0001_init.sql.
--
--  Adds:
--    · profiles.role / status / last_seen_at   (admin + account state)
--    · generations      — one row per itinerary generation attempt
--    · api_events       — one row per external API call (cost tracking)
--    · admin_audit_log  — every privileged admin action
--
--  The three new tables are service-role only: RLS is enabled with no
--  policies, so no browser session can read or write them. The admin UI
--  reads them through the service client *after* verifying the caller's
--  role, never directly from the client.
-- ═══════════════════════════════════════════════════════════════

-- ── Enums ──────────────────────────────────────────────────────
do $$ begin
  create type user_role_t as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status_t as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type api_provider_t as enum ('gemini', 'places', 'routes', 'weather');
exception when duplicate_object then null; end $$;

-- ── profiles: role, account state, activity ────────────────────
alter table public.profiles
  add column if not exists role            user_role_t      not null default 'user',
  add column if not exists status          account_status_t not null default 'active',
  add column if not exists last_seen_at    timestamptz,
  add column if not exists disabled_at     timestamptz,
  add column if not exists disabled_reason text;

create index if not exists profiles_role_idx      on public.profiles (role);
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

-- Existing rows have never reported activity; seed from their last update so
-- the "last active" column is not blank for accounts predating this table.
update public.profiles set last_seen_at = updated_at where last_seen_at is null;

-- ── generations ────────────────────────────────────────────────
-- One row per itinerary generation, saved or not. This is the honest
-- denominator for "trips generated" and "average cost per trip": the
-- trips table only holds the ones a user chose to keep.
create table if not exists public.generations (
  id           uuid primary key default gen_random_uuid(),
  -- Kept on user deletion so historical cost/volume reporting stays intact.
  user_id      uuid references auth.users (id) on delete set null,
  trip_id      uuid references public.trips (id) on delete set null,
  city         text not null,
  trip_date    date,
  budget       budget_t,
  travel_style travel_style_t,
  transport    transport_t,
  interests    text[] not null default '{}',
  stop_count   integer,
  refined      boolean not null default false,
  ok           boolean not null default true,
  error        text,
  duration_ms  integer,
  cost_usd     numeric(12, 6) not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists generations_created_idx on public.generations (created_at desc);
create index if not exists generations_user_idx    on public.generations (user_id, created_at desc);
create index if not exists generations_city_idx    on public.generations (city);

-- ── api_events ─────────────────────────────────────────────────
-- One row per outbound third-party call. `units` counts billable units:
-- 1 per request for most providers, N for a Routes matrix (N elements).
create table if not exists public.api_events (
  id            bigserial primary key,
  generation_id uuid references public.generations (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  provider      api_provider_t not null,
  operation     text not null,
  units         integer not null default 1,
  tokens_in     integer not null default 0,
  tokens_out    integer not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  latency_ms    integer,
  ok            boolean not null default true,
  status_code   integer,
  created_at    timestamptz not null default now()
);
create index if not exists api_events_created_idx  on public.api_events (created_at desc);
create index if not exists api_events_provider_idx on public.api_events (provider, created_at desc);
create index if not exists api_events_gen_idx      on public.api_events (generation_id);

-- ── admin_audit_log ────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  admin_id    uuid references auth.users (id) on delete set null,
  admin_email text,
  action      text not null,
  target_type text,
  target_id   text,
  details     text,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);

-- ═══════════════════════════════════════════════════════════════
--  Row-level security
-- ═══════════════════════════════════════════════════════════════

-- SECURITY DEFINER so a policy on `profiles` can call it without
-- re-entering that same policy (which would recurse infinitely).
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- Telemetry tables: RLS on, zero policies → only the service role can
-- reach them. Nothing reachable from a browser session touches these.
alter table public.generations     enable row level security;
alter table public.api_events      enable row level security;
alter table public.admin_audit_log enable row level security;

-- A user must not be able to promote themselves to admin, or re-enable their
-- own disabled account, by PATCHing their profile row.
--
-- RLS cannot express "this row, but not these columns", and writing the guard
-- as a policy subquery over `profiles` would recurse into that same policy.
-- Column-level GRANTs are the right tool: `authenticated` simply loses the
-- privilege to write role/status at all. The row-level `profiles_self` policy
-- from 0001 still governs *which* row they may touch.
--
-- service_role holds its own grants and is unaffected, so the admin API can
-- still change these columns.
revoke update on public.profiles from authenticated;
grant update (
  full_name, avatar_url, home_city, default_budget, default_style,
  default_transport, default_interests, onboarded, last_seen_at, updated_at
) on public.profiles to authenticated;

-- ═══════════════════════════════════════════════════════════════
--  Backfill: every saved trip was, by definition, generated once.
--  Without this the admin dashboard would look empty on day one.
--  cost_usd stays 0 — these predate cost tracking, so we do not
--  invent numbers for them.
-- ═══════════════════════════════════════════════════════════════
insert into public.generations (
  user_id, trip_id, city, trip_date, budget, travel_style,
  transport, interests, stop_count, ok, cost_usd, created_at
)
select
  t.user_id, t.id, t.city, t.trip_date, t.budget, t.travel_style,
  t.transport, t.interests,
  (select count(*) from public.stops s where s.trip_id = t.id),
  true, 0, t.created_at
from public.trips t
where not exists (
  select 1 from public.generations g where g.trip_id = t.id
);

-- ═══════════════════════════════════════════════════════════════
--  Bootstrap the admin account
-- ═══════════════════════════════════════════════════════════════
update public.profiles p
   set role = 'admin'
  from auth.users u
 where u.id = p.id
   and lower(u.email) = 'up100601@gmail.com';

-- Also grant on (re-)signup, so recreating that account keeps admin access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when lower(new.email) = 'up100601@gmail.com'
         then 'admin'::user_role_t
         else 'user'::user_role_t end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
