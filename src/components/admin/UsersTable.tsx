"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ShieldCheck } from "lucide-react";
import type { AdminUserRow } from "@/lib/admin/queries";
import { relativeTime, shortDate } from "@/lib/admin/format";
import { StatusPill, Avatar } from "@/components/admin/primitives";
import { cn } from "@/lib/utils";

/**
 * Searchable, sortable user list.
 *
 * The full list is rendered on the server and filtered here in memory, which
 * keeps search instant and avoids a round trip per keystroke. That trade
 * holds while the user base fits comfortably in one payload; past a few
 * thousand accounts this should move to server-side pagination.
 */

type SortKey = "joined" | "lastSeen" | "trips" | "saved";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "disabled", label: "Disabled" },
  { key: "admin", label: "Admins" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("joined");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = users.filter((u) => {
      if (filter === "active" && u.status !== "active") return false;
      if (filter === "disabled" && u.status !== "disabled") return false;
      if (filter === "admin" && u.role !== "admin") return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.fullName ?? "").toLowerCase().includes(q)
      );
    });

    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "lastSeen":
          return time(b.lastSeenAt) - time(a.lastSeenAt);
        case "trips":
          return b.trips - a.trips;
        case "saved":
          return b.savedPlaces + b.favorites - (a.savedPlaces + a.favorites);
        default:
          return time(b.joinedAt) - time(a.joinedAt);
      }
    });
  }, [users, query, filter, sort]);

  const SortHeader = ({
    label,
    sortKey,
    align = "left",
  }: {
    label: string;
    sortKey: SortKey;
    align?: "left" | "right";
  }) => (
    <th
      className={cn(
        "px-3 py-2.5 font-medium",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <button
        onClick={() => setSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-ink",
          sort === sortKey && "text-ink"
        )}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or name"
            className="h-10 w-full rounded-xl border border-line bg-white pl-10 pr-3.5 text-sm placeholder:text-faint focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-9 rounded-[var(--radius-pill)] border px-3.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink-soft hover:border-ink/30"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-faint">
              <th className="px-5 py-2.5 font-medium">User</th>
              <SortHeader label="Joined" sortKey="joined" />
              <SortHeader label="Trips" sortKey="trips" align="right" />
              <th className="px-3 py-2.5 text-right font-medium">Generated</th>
              <SortHeader label="Saved" sortKey="saved" align="right" />
              <SortHeader label="Last active" sortKey="lastSeen" />
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.id}
                className="border-b border-line-soft last:border-0 hover:bg-canvas"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <Avatar
                      name={u.fullName}
                      email={u.email}
                      src={u.avatarUrl}
                      size={30}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-ink hover:underline">
                          {u.email}
                        </span>
                        {u.role === "admin" && (
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-brand"
                            aria-label="Admin"
                          />
                        )}
                      </span>
                      {u.fullName && (
                        <span className="block truncate text-xs text-faint">
                          {u.fullName}
                          {u.provider ? ` · ${u.provider}` : ""}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted">{shortDate(u.joinedAt)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{u.trips}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">
                  {u.generations}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {u.savedPlaces + u.favorites}
                </td>
                <td className="px-3 py-3 text-muted">
                  {relativeTime(u.lastSeenAt)}
                </td>
                <td className="px-3 py-3">
                  <StatusPill status={u.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && (
        <p className="px-5 py-10 text-center text-sm text-faint">
          {users.length
            ? "No users match those filters."
            : "No users have signed up yet."}
        </p>
      )}

      <p className="border-t border-line px-5 py-3 text-xs text-faint">
        Showing {rows.length} of {users.length} accounts
      </p>
    </div>
  );
}
