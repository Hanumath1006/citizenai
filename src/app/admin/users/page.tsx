import { Users, UserCheck, UserX, Sparkles } from "lucide-react";
import { adminDb } from "@/lib/admin/auth";
import { getAdminUsers, startOfUtcDay } from "@/lib/admin/queries";
import { PageHeader, Panel, StatCard } from "@/components/admin/primitives";
import { UsersTable } from "@/components/admin/UsersTable";

export const metadata = { title: "Users — CitizenAI admin" };

export default async function AdminUsersPage() {
  const db = await adminDb();
  const users = await getAdminUsers(db);

  const todayStart = startOfUtcDay().getTime();
  const activeToday = users.filter(
    (u) => u.lastSeenAt && new Date(u.lastSeenAt).getTime() >= todayStart
  ).length;
  const disabled = users.filter((u) => u.status === "disabled").length;
  const totalTrips = users.reduce((s, u) => s + u.trips, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      <PageHeader
        title="Users"
        subtitle="Every registered account, what they've planned, and account controls."
      />

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={users.length} tone="brand" />
        <StatCard
          icon={UserCheck}
          label="Active today"
          value={activeToday}
          tone="green"
        />
        <StatCard
          icon={UserX}
          label="Disabled"
          value={disabled}
          tone={disabled ? "rose" : "blue"}
        />
        <StatCard
          icon={Sparkles}
          label="Trips saved"
          value={totalTrips}
          tone="accent"
        />
      </div>

      <Panel className="mt-6" bodyClassName="px-0 pb-0 pt-5">
        <UsersTable users={users} />
      </Panel>
    </div>
  );
}
