import { requireAdmin } from "@/lib/admin/auth";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";

export const metadata = { title: "Admin — CitizenAI" };

/**
 * Every page under /admin passes through here, so `requireAdmin()` is the
 * single gate for the whole console: signed-out visitors go to login,
 * signed-in non-admins are sent back to their own dashboard.
 *
 * Admin data is live operational state, so nothing here is cached.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const name = admin.fullName || admin.email.split("@")[0];

  return (
    // data-surface="admin" restores the original neutral palette for
    // everything inside; see the token block in globals.css. The traveller-
    // facing "Sandy Brown" theme deliberately stops at this boundary.
    <div data-surface="admin" className="flex min-h-screen bg-canvas">
      <AdminSidebar
        name={name}
        email={admin.email}
        avatarUrl={admin.avatarUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
