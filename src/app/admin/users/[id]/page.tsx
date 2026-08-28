import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Briefcase,
  Bookmark,
  DollarSign,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { adminDb, getAdminContext } from "@/lib/admin/auth";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { formatUsd } from "@/lib/usage/pricing";
import { dateTime, shortDate, relativeTime, duration } from "@/lib/admin/format";
import {
  Panel,
  StatCard,
  StatusPill,
  NoData,
  Avatar,
} from "@/components/admin/primitives";
import { UserActions } from "@/components/admin/UserActions";
import { RecordView } from "@/components/admin/RecordView";
import { Tag } from "@/components/ui/primitives";

export const metadata = { title: "User — CitizenAI admin" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await adminDb();
  const admin = await getAdminContext();

  const user = await getAdminUserDetail(db, id);
  if (!user) notFound();

  const name = user.fullName || user.email.split("@")[0];
  const savedTotal = user.savedPlaces + user.favorites;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 lg:px-8">
      <RecordView targetId={id} details={`Viewed user details for ${user.email}`} />

      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All users
      </Link>

      {/* ── Identity ────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <Avatar
            name={user.fullName}
            email={user.email}
            src={user.avatarUrl}
            size={56}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
              <StatusPill status={user.status} />
              {user.role === "admin" && <Tag tone="brand">Admin</Tag>}
            </div>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <UserActions
          userId={user.id}
          email={user.email}
          status={user.status}
          isAdminAccount={user.role === "admin"}
          isSelf={admin?.userId === user.id}
        />
      </div>

      {/* ── Usage at a glance ───────────────────────────────── */}
      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Itineraries generated"
          value={user.generations}
          hint={
            user.failedGenerations
              ? `${user.failedGenerations} failed`
              : undefined
          }
          tone="brand"
        />
        <StatCard
          icon={Briefcase}
          label="Trips saved"
          value={user.trips}
          hint={
            user.generations
              ? `${Math.round((user.trips / user.generations) * 100)}% kept`
              : undefined
          }
          tone="accent"
        />
        <StatCard
          icon={Bookmark}
          label="Saved & favorited"
          value={savedTotal}
          tone="green"
        />
        <StatCard
          icon={DollarSign}
          label="API cost to date"
          value={formatUsd(user.totalCost, { precise: true })}
          hint="Estimated"
          tone="blue"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ── Account facts ─────────────────────────────────── */}
        <Panel title="Account" className="lg:col-span-1">
          <dl className="space-y-3.5 text-sm">
            {[
              ["Joined", shortDate(user.joinedAt)],
              ["Last active", relativeTime(user.lastSeenAt)],
              ["Sign-in method", user.provider ?? "—"],
              ["Email confirmed", user.emailConfirmed ? "Yes" : "No"],
              ["Home city", user.homeCity ?? "Not set"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-medium capitalize">{value}</dd>
              </div>
            ))}
          </dl>

          {user.defaultInterests.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                Default interests
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {user.defaultInterests.map((i) => (
                  <Tag key={i}>{i}</Tag>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 border-t border-line pt-4 text-xs text-faint">
            User ID <span className="font-mono">{user.id}</span>
          </p>
        </Panel>

        {/* ── Generation history ────────────────────────────── */}
        <Panel
          title="Generation history"
          meta="Every itinerary this account has generated, saved or not"
          className="lg:col-span-2"
          bodyClassName="px-0 py-0"
        >
          {user.recentGenerations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs text-faint">
                    <th className="px-5 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">City</th>
                    <th className="px-3 py-2.5 text-right font-medium">Stops</th>
                    <th className="px-3 py-2.5 text-right font-medium">Took</th>
                    <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                    <th className="px-5 py-2.5 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {user.recentGenerations.map((g) => (
                    <tr
                      key={g.id}
                      className="border-b border-line-soft last:border-0"
                    >
                      <td className="px-5 py-3 text-muted">
                        {dateTime(g.createdAt)}
                      </td>
                      <td className="px-3 py-3 font-medium">{g.city}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {g.stopCount ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted">
                        {duration(g.durationMs)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {g.cost > 0
                          ? formatUsd(g.cost, { precise: true })
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {g.ok ? (
                          g.savedTripId ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Saved
                            </span>
                          ) : (
                            <span className="text-muted">Not saved</span>
                          )
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-rose-600"
                            title={g.error ?? undefined}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData>
              This account hasn&apos;t generated any itineraries yet.
            </NoData>
          )}
        </Panel>
      </div>

      {/* ── Saved trips ─────────────────────────────────────── */}
      <Panel title="Saved trips" className="mt-6">
        {user.recentTrips.length ? (
          <ul className="divide-y divide-line-soft">
            {user.recentTrips.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-xs text-faint">
                    {t.city} · {shortDate(t.tripDate)} · {t.status}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                  Saved {shortDate(t.createdAt)}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <NoData>No saved trips.</NoData>
        )}
      </Panel>
    </div>
  );
}
