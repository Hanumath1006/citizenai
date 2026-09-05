import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/**
 * Shared split-screen frame for every auth page (login, signup, password
 * reset, verify email) so they stay visually consistent.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Logo />
        <div className="mx-auto w-full max-w-sm py-12">
          <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface-raised px-3 py-1 text-xs font-medium text-muted">
            ✦ Your AI city companion
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          {children}
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

/** "or" divider between Google and email/password. */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
