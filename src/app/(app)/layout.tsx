import { redirect } from "next/navigation";
import { getAccountState, touchLastSeen } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Belt-and-suspenders: middleware already guards these routes.
  const account = await getAccountState();
  if (!account) redirect("/login");

  // An admin can disable an account mid-session. The Supabase-side ban stops
  // token refresh, but an already-issued token stays valid until it expires,
  // so the app shell checks status on every load and locks the door now.
  if (account.status === "disabled") redirect("/account-disabled");

  await touchLastSeen(account.userId);

  return (
    <AppShell isAdmin={account.role === "admin"}>{children}</AppShell>
  );
}
