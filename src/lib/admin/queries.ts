/* ──────────────────────────────────────────────────────────────
   Admin analytics queries.

   Every function here assumes the caller has already been authorized —
   they run on the service-role client, which bypasses RLS. Reach them only
   through `adminDb()` / `requireAdmin()`.

   Aggregation strategy: Postgres does the filtering and counting that it can
   express cheaply (exact-count heads, date ranges), and grouping happens in
   JS over a bounded window of rows. At this app's scale that keeps the whole
   analytics layer readable in one file with no stored procedures to migrate.
   The row caps below are the tripwire: if they start being hit, that is the
   signal to push the grouping down into SQL.

   All day boundaries are UTC, matching the server the app deploys to.
   ────────────────────────────────────────────────────────────── */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROVIDER_META, type Provider } from "@/lib/usage/pricing";

/** Upper bound on rows pulled for any single aggregation. */
const ROW_CAP = 20_000;

type Db = SupabaseClient;

/* ── date helpers ─────────────────────────────────────────────── */

export function startOfUtcDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function utcDaysAgo(n: number): Date {
  const x = startOfUtcDay();
  x.setUTCDate(x.getUTCDate() - n);
  return x;
}

export function startOfUtcMonth(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function isoDay(d: Date | string): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

/* ── shared shapes ────────────────────────────────────────────── */

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface RankedItem {
  label: string;
  value: number;
  /** Share of the relevant denominator, 0–1. Absent for pure counts. */
  share?: number;
}

/**
 * Bucket timestamps into a dense daily series — every day in the window gets
 * a point, including the zero days. A sparse series would make a quiet
 * Tuesday look like it never happened rather than like it had no traffic.
 */
function toDailySeries(timestamps: string[], days: number): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = isoDay(ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = isoDay(utcDaysAgo(i));
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

function rank(
  values: (string | null | undefined)[],
  opts?: { denominator?: number; limit?: number }
): RankedItem[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    const label = v.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const denominator = opts?.denominator ?? 0;
  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      value,
      share: denominator > 0 ? value / denominator : undefined,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, opts?.limit ?? 10);
}

/**
 * Resolve a `head: true` count query. Takes the built query rather than a
 * table name so callers can chain whatever filters they need and still get
 * full type inference on the builder.
 */
async function countOf(
  query: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** `select("*", { count: "exact", head: true })` — counts without fetching rows. */
function counter(db: Db, table: string) {
  return db.from(table).select("*", { count: "exact", head: true });
}

/* ── overview ─────────────────────────────────────────────────── */

export interface OverviewStats {
  totalUsers: number;
  newUsersThisWeek: number;
  activeToday: number;
  tripsGenerated: number;
  tripsThisWeek: number;
  savedPlaces: number;
  favorites: number;
  citiesExplored: number;
  costThisMonth: number;
}

export async function getOverviewStats(db: Db): Promise<OverviewStats> {
  const todayStart = startOfUtcDay().toISOString();
  const weekStart = utcDaysAgo(7).toISOString();
  const monthStart = startOfUtcMonth().toISOString();

  const [
    totalUsers,
    newUsersThisWeek,
    activeToday,
    tripsGenerated,
    tripsThisWeek,
    savedPlaces,
    favorites,
  ] = await Promise.all([
    countOf(counter(db, "profiles")),
    countOf(counter(db, "profiles").gte("created_at", weekStart)),
    countOf(counter(db, "profiles").gte("last_seen_at", todayStart)),
    countOf(counter(db, "generations")),
    countOf(counter(db, "generations").gte("created_at", weekStart)),
    countOf(counter(db, "saved_places")),
    countOf(counter(db, "favorites")),
  ]);

  const { data: cityRows } = await db
    .from("generations")
    .select("city")
    .limit(ROW_CAP);
  const citiesExplored = new Set(
    (cityRows ?? []).map((r) => (r.city as string)?.trim().toLowerCase())
  ).size;

  const { data: costRows } = await db
    .from("api_events")
    .select("cost_usd")
    .gte("created_at", monthStart)
    .limit(ROW_CAP);
  const costThisMonth = (costRows ?? []).reduce(
    (sum, r) => sum + Number(r.cost_usd ?? 0),
    0
  );

  return {
    totalUsers,
    newUsersThisWeek,
    activeToday,
    tripsGenerated,
    tripsThisWeek,
    savedPlaces,
    favorites,
    citiesExplored,
    costThisMonth,
  };
}

/* ── growth series ────────────────────────────────────────────── */

export interface GrowthSeries {
  newUsers: SeriesPoint[];
  generations: SeriesPoint[];
}

export async function getGrowthSeries(
  db: Db,
  days = 14
): Promise<GrowthSeries> {
  const since = utcDaysAgo(days - 1).toISOString();

  const [{ data: users }, { data: gens }] = await Promise.all([
    db.from("profiles").select("created_at").gte("created_at", since).limit(ROW_CAP),
    db
      .from("generations")
      .select("created_at")
      .gte("created_at", since)
      .limit(ROW_CAP),
  ]);

  return {
    newUsers: toDailySeries(
      (users ?? []).map((r) => r.created_at as string),
      days
    ),
    generations: toDailySeries(
      (gens ?? []).map((r) => r.created_at as string),
      days
    ),
  };
}

/* ── demand breakdowns ────────────────────────────────────────── */

export interface DemandBreakdown {
  topCities: RankedItem[];
  topInterests: RankedItem[];
  travelStyles: RankedItem[];
  budgets: RankedItem[];
  transports: RankedItem[];
  sampleSize: number;
}

/**
 * What people are actually asking for, drawn from `generations` rather than
 * `trips`: a trip row only exists if the user chose to save it, so using it
 * here would silently drop every itinerary someone generated and discarded.
 */
export async function getDemandBreakdown(db: Db): Promise<DemandBreakdown> {
  const { data } = await db
    .from("generations")
    .select("city, travel_style, budget, transport, interests")
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);

  const rows = data ?? [];
  const total = rows.length;

  // Interests are an array per generation, so the denominator is the number
  // of generations that named any interest — not the number of tag mentions.
  const withInterests = rows.filter(
    (r) => Array.isArray(r.interests) && r.interests.length > 0
  );
  const interestMentions = withInterests.flatMap(
    (r) => r.interests as string[]
  );

  return {
    topCities: rank(
      rows.map((r) => r.city as string),
      { denominator: total, limit: 8 }
    ),
    topInterests: rank(interestMentions, {
      denominator: withInterests.length,
      limit: 8,
    }),
    travelStyles: rank(
      rows.map((r) => r.travel_style as string),
      { denominator: total, limit: 6 }
    ),
    budgets: rank(
      rows.map((r) => r.budget as string),
      { denominator: total, limit: 6 }
    ),
    transports: rank(
      rows.map((r) => r.transport as string),
      { denominator: total, limit: 6 }
    ),
    sampleSize: total,
  };
}

/* ── API usage & cost ─────────────────────────────────────────── */

export interface ProviderUsage {
  provider: Provider;
  label: string;
  tint: string;
  calls: number;
  units: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  failures: number;
  avgLatencyMs: number | null;
  share: number;
}

export interface UsageReport {
  costToday: number;
  costThisMonth: number;
  costProjectedMonth: number;
  avgCostPerTrip: number;
  generationsThisMonth: number;
  pricedGenerations: number;
  providers: ProviderUsage[];
  dailyCost: SeriesPoint[];
  totalCalls: number;
  totalTokens: number;
}

export async function getUsageReport(db: Db, days = 30): Promise<UsageReport> {
  const monthStart = startOfUtcMonth();
  const todayStart = startOfUtcDay();
  const windowStart = utcDaysAgo(days - 1);
  // Widen the fetch to cover both the chart window and the calendar month.
  const since = new Date(Math.min(monthStart.getTime(), windowStart.getTime()));

  const { data: events } = await db
    .from("api_events")
    .select("provider, units, tokens_in, tokens_out, cost_usd, latency_ms, ok, created_at")
    .gte("created_at", since.toISOString())
    .limit(ROW_CAP);

  const rows = events ?? [];

  let costToday = 0;
  let costThisMonth = 0;
  let totalCalls = 0;
  let totalTokens = 0;

  const byProvider = new Map<
    Provider,
    {
      calls: number;
      units: number;
      tokensIn: number;
      tokensOut: number;
      cost: number;
      failures: number;
      latencySum: number;
      latencyCount: number;
    }
  >();

  const dailyCostMap = new Map<string, number>();

  for (const r of rows) {
    const cost = Number(r.cost_usd ?? 0);
    const at = new Date(r.created_at as string);
    const provider = r.provider as Provider;

    if (at >= monthStart) costThisMonth += cost;
    if (at >= todayStart) costToday += cost;

    if (at >= windowStart) {
      const key = isoDay(at);
      dailyCostMap.set(key, (dailyCostMap.get(key) ?? 0) + cost);
    }

    // Provider totals are month-to-date, matching the cost headline.
    if (at < monthStart) continue;

    totalCalls += 1;
    totalTokens += Number(r.tokens_in ?? 0) + Number(r.tokens_out ?? 0);

    const acc = byProvider.get(provider) ?? {
      calls: 0,
      units: 0,
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      failures: 0,
      latencySum: 0,
      latencyCount: 0,
    };
    acc.calls += 1;
    acc.units += Number(r.units ?? 1);
    acc.tokensIn += Number(r.tokens_in ?? 0);
    acc.tokensOut += Number(r.tokens_out ?? 0);
    acc.cost += cost;
    if (r.ok === false) acc.failures += 1;
    if (r.latency_ms != null) {
      acc.latencySum += Number(r.latency_ms);
      acc.latencyCount += 1;
    }
    byProvider.set(provider, acc);
  }

  const providers: ProviderUsage[] = (
    Object.keys(PROVIDER_META) as Provider[]
  ).map((provider) => {
    const acc = byProvider.get(provider);
    return {
      provider,
      label: PROVIDER_META[provider].label,
      tint: PROVIDER_META[provider].tint,
      calls: acc?.calls ?? 0,
      units: acc?.units ?? 0,
      tokensIn: acc?.tokensIn ?? 0,
      tokensOut: acc?.tokensOut ?? 0,
      cost: acc?.cost ?? 0,
      failures: acc?.failures ?? 0,
      avgLatencyMs:
        acc && acc.latencyCount > 0
          ? Math.round(acc.latencySum / acc.latencyCount)
          : null,
      share: costThisMonth > 0 ? (acc?.cost ?? 0) / costThisMonth : 0,
    };
  });

  const dailyCost: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = isoDay(utcDaysAgo(i));
    dailyCost.push({ date: key, value: dailyCostMap.get(key) ?? 0 });
  }

  // Average cost per trip is computed only over generations that actually
  // carry a cost. Backfilled rows from before telemetry existed have
  // cost_usd = 0; averaging them in would drag the number toward zero and
  // make each itinerary look cheaper than it is.
  const { data: gens } = await db
    .from("generations")
    .select("cost_usd, created_at")
    .gte("created_at", monthStart.toISOString())
    .limit(ROW_CAP);

  const genRows = gens ?? [];
  const priced = genRows.filter((g) => Number(g.cost_usd ?? 0) > 0);
  const avgCostPerTrip = priced.length
    ? priced.reduce((s, g) => s + Number(g.cost_usd ?? 0), 0) / priced.length
    : 0;

  // Straight-line projection from month-to-date spend.
  const now = new Date();
  const daysElapsed = Math.max(1, now.getUTCDate());
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const costProjectedMonth = (costThisMonth / daysElapsed) * daysInMonth;

  return {
    costToday,
    costThisMonth,
    costProjectedMonth,
    avgCostPerTrip,
    generationsThisMonth: genRows.length,
    pricedGenerations: priced.length,
    providers,
    dailyCost,
    totalCalls,
    totalTokens,
  };
}

/* ── users ────────────────────────────────────────────────────── */

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  status: "active" | "disabled";
  joinedAt: string;
  lastSeenAt: string | null;
  provider: string | null;
  emailConfirmed: boolean;
  trips: number;
  generations: number;
  favorites: number;
  savedPlaces: number;
}

/**
 * Email, sign-in provider and confirmation state live in `auth.users`, which
 * PostgREST does not expose. They come from the Admin API instead, and are
 * joined to the public profile rows in memory.
 */
async function listAuthUsers(db: Db, perPage = 1000) {
  const map = new Map<
    string,
    { email: string; provider: string | null; confirmed: boolean }
  >();

  // The Admin API pages at 1000; loop until a short page comes back.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      map.set(u.id, {
        email: u.email ?? "",
        provider:
          (u.app_metadata?.provider as string | undefined) ??
          (u.identities?.[0]?.provider as string | undefined) ??
          null,
        confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      });
    }
    if (users.length < perPage) break;
  }
  return map;
}

export async function getAdminUsers(db: Db): Promise<AdminUserRow[]> {
  const [{ data: profiles }, authUsers] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, avatar_url, role, status, created_at, last_seen_at")
      .order("created_at", { ascending: false })
      .limit(ROW_CAP),
    listAuthUsers(db),
  ]);

  // Per-user tallies. Four narrow selects beat N+1 counts per row.
  const [{ data: trips }, { data: gens }, { data: favs }, { data: saved }] =
    await Promise.all([
      db.from("trips").select("user_id").limit(ROW_CAP),
      db.from("generations").select("user_id").limit(ROW_CAP),
      db.from("favorites").select("user_id").limit(ROW_CAP),
      db.from("saved_places").select("user_id").limit(ROW_CAP),
    ]);

  const tally = (rows: { user_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.user_id) continue;
      m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    }
    return m;
  };

  const tripCounts = tally(trips as { user_id: string | null }[] | null);
  const genCounts = tally(gens as { user_id: string | null }[] | null);
  const favCounts = tally(favs as { user_id: string | null }[] | null);
  const savedCounts = tally(saved as { user_id: string | null }[] | null);

  return (profiles ?? []).map((p) => {
    const auth = authUsers.get(p.id as string);
    return {
      id: p.id as string,
      email: auth?.email ?? "—",
      fullName: (p.full_name as string) ?? null,
      avatarUrl: (p.avatar_url as string) ?? null,
      role: p.role as "user" | "admin",
      status: p.status as "active" | "disabled",
      joinedAt: p.created_at as string,
      lastSeenAt: (p.last_seen_at as string) ?? null,
      provider: auth?.provider ?? null,
      emailConfirmed: auth?.confirmed ?? false,
      trips: tripCounts.get(p.id as string) ?? 0,
      generations: genCounts.get(p.id as string) ?? 0,
      favorites: favCounts.get(p.id as string) ?? 0,
      savedPlaces: savedCounts.get(p.id as string) ?? 0,
    };
  });
}

export interface AdminUserDetail extends AdminUserRow {
  homeCity: string | null;
  defaultInterests: string[];
  totalCost: number;
  failedGenerations: number;
  recentGenerations: {
    id: string;
    city: string;
    tripDate: string | null;
    stopCount: number | null;
    ok: boolean;
    error: string | null;
    cost: number;
    durationMs: number | null;
    savedTripId: string | null;
    createdAt: string;
  }[];
  recentTrips: {
    id: string;
    title: string;
    city: string;
    tripDate: string;
    status: string;
    createdAt: string;
  }[];
}

export async function getAdminUserDetail(
  db: Db,
  userId: string
): Promise<AdminUserDetail | null> {
  const { data: profile } = await db
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, status, created_at, last_seen_at, home_city, default_interests"
    )
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const { data: authUser } = await db.auth.admin.getUserById(userId);

  const [{ data: gens }, { data: trips }, favorites, savedPlaces] =
    await Promise.all([
      db
        .from("generations")
        .select(
          "id, city, trip_date, stop_count, ok, error, cost_usd, duration_ms, trip_id, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("trips")
        .select("id, title, city, trip_date, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      countOf(counter(db, "favorites").eq("user_id", userId)),
      countOf(counter(db, "saved_places").eq("user_id", userId)),
    ]);

  const genRows = gens ?? [];
  const tripRows = trips ?? [];

  return {
    id: profile.id as string,
    email: authUser?.user?.email ?? "—",
    fullName: (profile.full_name as string) ?? null,
    avatarUrl: (profile.avatar_url as string) ?? null,
    role: profile.role as "user" | "admin",
    status: profile.status as "active" | "disabled",
    joinedAt: profile.created_at as string,
    lastSeenAt: (profile.last_seen_at as string) ?? null,
    provider:
      (authUser?.user?.app_metadata?.provider as string | undefined) ?? null,
    emailConfirmed: Boolean(authUser?.user?.email_confirmed_at),
    homeCity: (profile.home_city as string) ?? null,
    defaultInterests: (profile.default_interests as string[]) ?? [],
    trips: tripRows.length,
    generations: genRows.length,
    favorites,
    savedPlaces,
    totalCost: genRows.reduce((s, g) => s + Number(g.cost_usd ?? 0), 0),
    failedGenerations: genRows.filter((g) => g.ok === false).length,
    recentGenerations: genRows.slice(0, 25).map((g) => ({
      id: g.id as string,
      city: g.city as string,
      tripDate: (g.trip_date as string) ?? null,
      stopCount: (g.stop_count as number) ?? null,
      ok: g.ok as boolean,
      error: (g.error as string) ?? null,
      cost: Number(g.cost_usd ?? 0),
      durationMs: (g.duration_ms as number) ?? null,
      savedTripId: (g.trip_id as string) ?? null,
      createdAt: g.created_at as string,
    })),
    recentTrips: tripRows.slice(0, 10).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      city: t.city as string,
      tripDate: t.trip_date as string,
      status: t.status as string,
      createdAt: t.created_at as string,
    })),
  };
}

/* ── audit log ────────────────────────────────────────────────── */

export interface AuditEntry {
  id: number;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export async function getAuditLog(db: Db, limit = 50): Promise<AuditEntry[]> {
  const { data } = await db
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as number,
    adminEmail: (r.admin_email as string) ?? null,
    action: r.action as string,
    targetType: (r.target_type as string) ?? null,
    targetId: (r.target_id as string) ?? null,
    details: (r.details as string) ?? null,
    ip: (r.ip as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

/* ── system health ────────────────────────────────────────────── */

export interface ProviderHealth {
  provider: Provider;
  label: string;
  calls: number;
  failures: number;
  errorRate: number;
  status: "operational" | "degraded" | "down" | "idle";
}

/**
 * Health is inferred from our own call outcomes over the last 24 hours —
 * it reports whether *this app's* integrations are working, which is the
 * question an operator actually has. It is not a vendor status feed.
 */
export async function getProviderHealth(db: Db): Promise<ProviderHealth[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("api_events")
    .select("provider, ok")
    .gte("created_at", since)
    .limit(ROW_CAP);

  const rows = data ?? [];
  return (Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
    const mine = rows.filter((r) => r.provider === provider);
    const failures = mine.filter((r) => r.ok === false).length;
    const errorRate = mine.length ? failures / mine.length : 0;

    let status: ProviderHealth["status"] = "operational";
    if (!mine.length) status = "idle";
    else if (errorRate >= 0.5) status = "down";
    else if (errorRate >= 0.1) status = "degraded";

    return {
      provider,
      label: PROVIDER_META[provider].label,
      calls: mine.length,
      failures,
      errorRate,
      status,
    };
  });
}
