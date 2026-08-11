import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Logo } from "@/components/ui/Logo";
import { getUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getUser();
  if (user) redirect(next || "/dashboard");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Logo />
        <div className="mx-auto w-full max-w-sm py-16">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
            ✦ Your AI city companion
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            Welcome to CitizenAI
          </h1>
          <p className="mt-2 text-muted">
            Sign in to plan smarter outings and pick up where you left off.
          </p>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              We couldn&apos;t sign you in. Please try again.
            </p>
          )}

          <div className="mt-8">
            <GoogleButton next={next || "/dashboard"} />
          </div>

          <p className="mt-6 text-xs text-faint leading-relaxed">
            By continuing you agree to our Terms and acknowledge our Privacy
            Policy. We only use your Google profile to personalize your trips.
          </p>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Back to home
        </Link>
      </div>

      {/* Visual side */}
      <div className="relative hidden lg:block bg-canvas-warm overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-sm/relaxed opacity-80">2:00 PM · Coffee</p>
          <p className="mt-1 text-2xl font-semibold">
            Spend less time planning. More time exploring.
          </p>
        </div>
      </div>
    </div>
  );
}
