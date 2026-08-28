import Link from "next/link";
import { adminDb } from "@/lib/admin/auth";
import { getAuditLog } from "@/lib/admin/queries";
import { ACTION_LABELS } from "@/lib/admin/audit";
import { dateTime } from "@/lib/admin/format";
import { PageHeader, Panel, NoData } from "@/components/admin/primitives";

export const metadata = { title: "Activity log — CitizenAI admin" };

/** Actions that changed something, highlighted apart from plain views. */
const MUTATING = new Set(["disable_user", "enable_user", "delete_user"]);

export default async function AdminActivityPage() {
  const db = await adminDb();
  const entries = await getAuditLog(db, 200);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 lg:px-8">
      <PageHeader
        title="Activity log"
        subtitle="Every privileged action taken in this console, newest first."
      />

      <Panel className="mt-7" bodyClassName="px-0 py-0">
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-faint">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Admin</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                  <th className="px-3 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 font-medium">IP address</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {dateTime(e.createdAt)}
                    </td>
                    <td className="px-3 py-3">{e.adminEmail ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          MUTATING.has(e.action)
                            ? "font-medium text-ink"
                            : "text-muted"
                        }
                      >
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="max-w-[380px] px-3 py-3 text-muted">
                      {e.targetType === "user" && e.targetId ? (
                        <Link
                          href={`/admin/users/${e.targetId}`}
                          className="hover:text-ink hover:underline"
                        >
                          {e.details ?? e.targetId}
                        </Link>
                      ) : (
                        (e.details ?? "—")
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-faint">
                      {e.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData>
            No admin actions recorded yet. Disabling, re-enabling, deleting or
            viewing an account will appear here.
          </NoData>
        )}
      </Panel>

      <p className="mt-4 text-xs text-faint">
        Showing the {entries.length} most recent entries. Deleted accounts keep
        their log entry — the record is written before the account is removed.
      </p>
    </div>
  );
}
