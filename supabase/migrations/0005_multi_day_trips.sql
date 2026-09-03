-- ═══════════════════════════════════════════════════════════════
--  CitizenAI · multi-day trips
--
--  A trip was one date with one ordered list of stops. It becomes a date
--  range with stops tagged by day, so the planner covers a weekend or a
--  week away rather than only a single outing.
--
--  Deliberately additive: a one-day trip is just a trip whose end_date
--  equals its start date and whose stops all sit on day 1. Every existing
--  row already satisfies that, so nothing needs rewriting and old trips
--  keep rendering unchanged.
-- ═══════════════════════════════════════════════════════════════

-- ── trips: the closing date of the range ───────────────────────
alter table public.trips
  add column if not exists end_date date;

-- Existing trips are single-day by definition.
update public.trips set end_date = trip_date where end_date is null;

-- Enforce it going forward, now that every row has a value.
alter table public.trips
  alter column end_date set not null;

do $$ begin
  alter table public.trips
    add constraint trips_date_range_valid check (end_date >= trip_date);
exception when duplicate_object then null; end $$;

-- ── stops: which day of the trip a stop belongs to ─────────────
-- 1-based, so day_index 1 is the trip's start date.
alter table public.stops
  add column if not exists day_index integer not null default 1;

do $$ begin
  alter table public.stops
    add constraint stops_day_index_positive check (day_index >= 1);
exception when duplicate_object then null; end $$;

-- `ord` is now the order *within* a day, so the useful index leads with
-- the day. Replaces the old (trip_id, ord) index rather than sitting
-- alongside it — that one can no longer answer a query on its own.
drop index if exists public.stops_trip_idx;
create index if not exists stops_trip_day_idx
  on public.stops (trip_id, day_index, ord);

-- ── generations: record the range for cost analytics ───────────
-- Days per generation is the single biggest driver of what an itinerary
-- costs to produce, so the admin usage view needs it to explain spend.
alter table public.generations
  add column if not exists end_date date,
  add column if not exists day_count integer not null default 1;

update public.generations
   set end_date = trip_date
 where end_date is null;

do $$ begin
  alter table public.generations
    add constraint generations_day_count_positive check (day_count >= 1);
exception when duplicate_object then null; end $$;
