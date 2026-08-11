import Link from "next/link";
import { CreditCard, UserCog, ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";
import { SignOutButton } from "@/components/app/SignOutButton";

export const metadata = { title: "Settings — CitizenAI" };

export default async function SettingsPage() {
  const user = await getUser();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted">Manage your account and preferences.</p>

      <div className="mt-8 space-y-4">
        <Card className="flex items-center gap-4 p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-line-soft text-ink-soft">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Account</p>
            <p className="truncate text-sm text-muted">
              Signed in as {user?.email}
            </p>
          </div>
          <div className="ml-auto">
            <SignOutButton />
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-6">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-line-soft text-ink-soft">
            <UserCog className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Planning preferences</p>
            <p className="text-sm text-muted">
              Your default budget, travel style and interests.
            </p>
          </div>
          <Link
            href="/profile"
            className="ml-auto text-sm font-medium text-brand hover:underline"
          >
            Edit
          </Link>
        </Card>

        <Card className="flex items-center gap-4 p-6 opacity-70">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-line-soft text-ink-soft">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium">Billing</p>
            <p className="text-sm text-muted">
              Upgrade for unlimited planning — coming soon.
            </p>
          </div>
          <span className="ml-auto rounded-[var(--radius-pill)] bg-line-soft px-3 py-1 text-xs font-medium text-faint">
            Soon
          </span>
        </Card>
      </div>
    </div>
  );
}
