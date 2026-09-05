import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResendVerification } from "@/components/auth/ResendVerification";

export const metadata = { title: "Verify your email — CitizenAI" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      title="Check your inbox"
      subtitle={
        email
          ? `We sent a verification link to ${email}.`
          : "We sent you a verification link."
      }
    >
      <div className="mt-8 space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-raised px-4 py-4 text-sm">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="text-muted">
            <p className="font-medium text-ink">One more step</p>
            <p className="mt-1 leading-relaxed">
              Click the link in that email to activate your account, then sign
              in. The link expires in 24 hours.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted">
          Didn&apos;t get it? Check your spam folder, or resend below.
        </p>

        {email && <ResendVerification email={email} />}

        <Link
          href="/login"
          className="block pt-2 text-sm text-brand hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
