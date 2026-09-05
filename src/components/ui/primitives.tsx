import * as React from "react";
import { cn } from "@/lib/utils";

/** Rounded surface card matching the product mockups. */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-surface border border-line shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Selectable / static pill. */
export function Pill({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-[var(--radius-pill)] px-4 h-9 text-sm font-medium border transition-all duration-200",
        active
          ? "bg-ink text-white border-ink"
          : "bg-surface-raised text-ink-soft border-line hover:border-ink/30",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Small non-interactive label chip (e.g. category, tag). */
export function Tag({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "brand";
}) {
  const tones = {
    neutral: "bg-line-soft text-ink-soft",
    accent: "bg-accent-soft text-accent",
    brand: "bg-brand-soft text-brand",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-3 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Uppercase field / section label. */
export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-faint",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

/** Text input styled to match the planner mockup. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full h-11 rounded-xl border border-line bg-surface-raised px-3.5 text-sm text-ink placeholder:text-faint",
        "focus:outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition",
        className
      )}
      {...props}
    />
  );
});

/** Native select styled to match. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full h-11 appearance-none rounded-xl border border-line bg-surface-raised px-3.5 pr-9 text-sm text-ink",
          "focus:outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5 transition cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
});
