import { ShieldAlert } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignOutButton } from "@/components/app/SignOutButton";

export const metadata = { title: "Account disabled — CitizenAI" };

export default function AccountDisabledPage() {
  return (
    <AuthShell
      title="Account disabled"
      subtitle="This CitizenAI account has been turned off by an administrator."
    >
      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-raised px-4 py-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-muted">
            <p className="font-medium text-ink">Your data is still here</p>
            <p className="mt-1 leading-relaxed">
              Nothing has been deleted. Your trips and saved places will be
              waiting if the account is re-enabled.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted">
          If you think this is a mistake, reply to any CitizenAI email and
          we&apos;ll take a look.
        </p>

        <SignOutButton
          label="Sign out"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
        />
      </div>
    </AuthShell>
  );
}
