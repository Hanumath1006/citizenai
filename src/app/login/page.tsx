import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell, AuthDivider } from "@/components/auth/AuthShell";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Sign in — CitizenAI" };

const ERRORS: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  verify:
    "That verification link is invalid or has expired. Sign in to request a new one.",
  link: "That link looks incomplete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getUser();
  if (user) redirect(next || "/dashboard");

  const target = next || "/dashboard";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to plan smarter outings and pick up where you left off."
    >
      {error && ERRORS[error] && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {ERRORS[error]}
        </p>
      )}

      <div className="mt-8">
        <GoogleButton next={target} />
      </div>

      <AuthDivider />

      <LoginForm next={target} />

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={
            next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"
          }
          className="font-medium text-brand hover:underline"
        >
          Sign up
        </Link>
      </p>

      <p className="mt-6 text-xs text-faint leading-relaxed">
        By continuing you agree to our Terms and acknowledge our Privacy Policy.
      </p>
    </AuthShell>
  );
}
