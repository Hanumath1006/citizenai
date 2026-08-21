import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthShell, AuthDivider } from "@/components/auth/AuthShell";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Create your account — CitizenAI" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getUser();
  if (user) redirect(next || "/dashboard");

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start planning smarter outings in seconds."
    >
      <div className="mt-8">
        <GoogleButton next={next || "/dashboard"} label="Sign up with Google" />
      </div>

      <AuthDivider />

      <SignupForm />

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-6 text-xs text-faint leading-relaxed">
        By creating an account you agree to our Terms and acknowledge our
        Privacy Policy.
      </p>
    </AuthShell>
  );
}
