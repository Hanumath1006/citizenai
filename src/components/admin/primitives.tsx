import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber, percent } from "@/lib/admin/format";

/* ──────────────────────────────────────────────────────────────
   Building blocks shared across the admin views. All server
   components — nothing here needs interactivity.
   ────────────────────────────────────────────────────────────── */

/** Page heading with an optional right-hand action slot. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Bordered surface with an optional titled header and footer link. */
export function Panel({
  title,
  meta,
  action,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  footer?: { href: string; label: string };
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-sm font-semibold text-ink">
                {title}
              </h2>
            )}
            {meta && <div className="mt-0.5 text-xs text-faint">{meta}</div>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("flex-1 px-5 py-4", bodyClassName)}>{children}</div>
      {footer && (
        <Link
          href={footer.href}
          className="mx-5 mb-5 flex h-10 items-center justify-center rounded-xl border border-line text-sm font-medium text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
        >
          {footer.label}
        </Link>
      )}
    </section>
  );
}

const TONES = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-500",
} as const;

export type Tone = keyof typeof TONES;

/** Headline metric card. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  tone = "brand",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  /** Period-over-period change as a ratio; omitted when there's no baseline. */
  delta?: number | null;
  tone?: Tone;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", TONES[tone])}
        >
          <Icon className="h-4 w-4" />
        </span>
        {delta != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              up ? "text-emerald-600" : "text-rose-500"
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {percent(Math.abs(delta), 1)}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? compactNumber(value) : value}
      </p>
      <p className="text-xs text-faint">{label}</p>
      {hint && <p className="mt-1 text-[0.7rem] text-faint">{hint}</p>}
    </div>
  );
}

/** Small status chip. */
export function StatusPill({
  status,
}: {
  status: "active" | "disabled" | "operational" | "degraded" | "down" | "idle";
}) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    operational: "bg-emerald-50 text-emerald-700",
    disabled: "bg-line-soft text-muted",
    idle: "bg-line-soft text-muted",
    degraded: "bg-amber-50 text-amber-700",
    down: "bg-rose-50 text-rose-600",
  };
  const labels: Record<string, string> = {
    active: "Active",
    disabled: "Inactive",
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    idle: "No traffic",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

/** Placeholder for a panel with nothing to show yet. */
export function NoData({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center px-4 text-center text-sm text-faint">
      {children}
    </div>
  );
}

/** Circular avatar falling back to initials. */
export function Avatar({
  name,
  email,
  src,
  size = 32,
}: {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: number;
}) {
  const source = name || email || "?";
  const initials = source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
