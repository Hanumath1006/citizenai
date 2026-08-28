import Link from "next/link";
import {
  Users,
  Sparkles,
  MapPin,
  Bookmark,
  Zap,
} from "lucide-react";
import { adminDb } from "@/lib/admin/auth";
import {
  getOverviewStats,
  getGrowthSeries,
  getDemandBreakdown,
  getUsageReport,
  getAdminUsers,
  getAuditLog,
  getProviderHealth,
} from "@/lib/admin/queries";
import { ACTION_LABELS } from "@/lib/admin/audit";
import { formatUsd } from "@/lib/usage/pricing";
import {
  relativeTime,
  shortDate,
  dateTime,
  compactNumber,
  percent,
  trend,
} from "@/lib/admin/format";
import {
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
  NoData,
  Avatar,
} from "@/components/admin/primitives";
import { AreaChart, BarList, StackedBar } from "@/components/admin/Charts";

export const metadata = { title: "Admin overview — CitizenAI" };

const STYLE_COLORS = ["#6d5efc", "#e8722c", "#12a594", "#2b8ef7"];

/** Sum the last `n` points of a daily series. */
function tail(series: { value: number }[], n: number) {
  return series.slice(-n).reduce((s, p) => s + p.value, 0);
}

export default async function AdminOverviewPage() {
  const db = await adminDb();

  const [stats, growth, demand, usage, users, audit, health] =
    await Promise.all([
      getOverviewStats(db),
      getGrowthSeries(db, 14),
      getDemandBreakdown(db),
      getUsageReport(db, 14),
      getAdminUsers(db),
      getAuditLog(db, 6),
      getProviderHealth(db),
    ]);

  // Week-over-week deltas come straight from the 14-day series — no extra
  // queries, and the two halves are guaranteed to be equal-length windows.
  const usersDelta = trend(
    tail(growth.newUsers, 7),
    tail(growth.newUsers.slice(0, 7), 7)
  );
  const gensDelta = trend(
    tail(growth.generations, 7),
    tail(growth.generations.slice(0, 7), 7)
  );

  const recentUsers = users.slice(0, 5);
  const degraded = health.filter(
    (h) => h.status === "degraded" || h.status === "down"
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      <PageHeader
        title="Overview"
        subtitle="Key metrics, demand signals and system health. All dates UTC."
      />

      {/* ── Headline metrics ────────────────────────────────── */}
      <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats.totalUsers}
          delta={usersDelta}
          hint={`${stats.newUsersThisWeek} joined this week`}
          tone="brand"
        />
        <StatCard
          icon={Zap}
          label="Active today"
          value={stats.activeToday}
          tone="rose"
        />
        <StatCard
          icon={Sparkles}
          label="Trips generated"
          value={stats.tripsGenerated}
          delta={gensDelta}
          tone="accent"
        />
        <StatCard
          icon={Sparkles}
          label="Trips this week"
          value={stats.tripsThisWeek}
          tone="green"
        />
        <StatCard
          icon={MapPin}
          label="Cities explored"
          value={stats.citiesExplored}
          tone="blue"
        />
        <StatCard
          icon={Bookmark}
          label="Saved places"
          value={stats.savedPlaces + stats.favorites}
          hint={`${stats.favorites} favorites`}
          tone="accent"
        />
      </div>

      {/* ── Generations + top cities ────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Trip generations"
          meta="Last 14 days"
          className="lg:col-span-2"
        >
          {stats.tripsGenerated ? (
            <AreaChart id="generations" data={growth.generations} color="#6d5efc" />
          ) : (
            <NoData>
              No itineraries generated yet. This fills in as people use the
              planner.
            </NoData>
          )}
        </Panel>

        <Panel
          title="Top cities"
          meta={`${compactNumber(demand.sampleSize)} generations`}
          footer={{ href: "/admin/usage", label: "View usage breakdown" }}
        >
          {demand.topCities.length ? (
            <BarList items={demand.topCities.slice(0, 5)} showRank />
          ) : (
            <NoData>No city data yet.</NoData>
          )}
        </Panel>
      </div>

      {/* ── New users + top interests ───────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="New users" meta="Last 14 days" className="lg:col-span-2">
          {stats.totalUsers ? (
            <AreaChart id="new-users" data={growth.newUsers} color="#12a594" />
          ) : (
            <NoData>No sign-ups yet.</NoData>
          )}
        </Panel>

        <Panel
          title="Top interests"
          meta="Share of itineraries requesting each"
        >
          {demand.topInterests.length ? (
            <BarList
              items={demand.topInterests.slice(0, 5)}
              valueMode="share"
              color="#e8722c"
            />
          ) : (
            <NoData>No interest data yet.</NoData>
          )}
        </Panel>
      </div>

      {/* ── Recent users + travel type ──────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Recent users"
          className="lg:col-span-2"
          bodyClassName="px-0 py-0"
          action={
            <Link
              href="/admin/users"
              className="shrink-0 text-sm font-medium text-brand hover:underline"
            >
              View all users
            </Link>
          }
        >
          {recentUsers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs text-faint">
                    <th className="px-5 py-2.5 font-medium">User</th>
                    <th className="px-3 py-2.5 font-medium">Joined</th>
                    <th className="px-3 py-2.5 text-right font-medium">Trips</th>
                    <th className="px-3 py-2.5 text-right font-medium">Saved</th>
                    <th className="px-3 py-2.5 font-medium">Last active</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-line-soft last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="flex items-center gap-2.5 hover:underline"
                        >
                          <Avatar
                            name={u.fullName}
                            email={u.email}
                            src={u.avatarUrl}
                            size={28}
                          />
                          <span className="truncate">{u.email}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {shortDate(u.joinedAt)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {u.trips}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {u.savedPlaces + u.favorites}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {relativeTime(u.lastSeenAt)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={u.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData>No users yet.</NoData>
          )}
        </Panel>

        <Panel title="Travel type" meta="Who people plan with">
          {demand.travelStyles.length ? (
            <StackedBar items={demand.travelStyles} colors={STYLE_COLORS} />
          ) : (
            <NoData>No travel style data yet.</NoData>
          )}
        </Panel>
      </div>

      {/* ── Costs + health + audit ──────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="API usage & costs"
          meta="Month to date"
          footer={{ href: "/admin/usage", label: "View detailed breakdown" }}
        >
          <ul className="space-y-3">
            {usage.providers.map((p) => (
              <li key={p.provider} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: p.tint }}
                />
                <span className="flex-1 truncate text-sm text-ink-soft">
                  {p.label}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatUsd(p.cost)}
                </span>
                <span className="w-11 text-right text-xs tabular-nums text-faint">
                  {percent(p.share)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatUsd(usage.costThisMonth)}
            </span>
          </div>
          <p className="mt-1 text-xs text-faint">
            {formatUsd(usage.costToday)} today ·{" "}
            {formatUsd(usage.avgCostPerTrip, { precise: true })} per itinerary
          </p>
        </Panel>

        <Panel title="System health" meta="Our calls, last 24 hours">
          <div className="mb-4 flex items-center gap-2">
            {degraded.length ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  {degraded.length} service
                  {degraded.length > 1 ? "s" : ""} degraded
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">
                  All systems operational
                </span>
              </>
            )}
          </div>
          <ul className="space-y-3">
            {health.map((h) => (
              <li
                key={h.provider}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-soft">{h.label}</p>
                  <p className="text-xs text-faint">
                    {h.calls
                      ? `${compactNumber(h.calls)} calls · ${percent(h.errorRate, 1)} errors`
                      : "No calls"}
                  </p>
                </div>
                <StatusPill status={h.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Admin activity"
          meta="Privileged actions"
          footer={{ href: "/admin/activity", label: "View full log" }}
        >
          {audit.length ? (
            <ul className="space-y-3.5">
              {audit.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-medium text-ink">
                    {ACTION_LABELS[a.action] ?? a.action}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {a.details ?? a.targetId ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">
                    {dateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <NoData>No admin actions recorded yet.</NoData>
          )}
        </Panel>
      </div>
    </div>
  );
}
