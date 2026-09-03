import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a money range, e.g. { low: 60, high: 85 } → "$60–85". */
export function formatCostRange(low?: number | null, high?: number | null) {
  if (low == null && high == null) return "—";
  if (low != null && high != null) {
    if (low === high) return `$${low}`;
    return `$${low}–${high}`;
  }
  return `$${low ?? high}`;
}

/** "2:00 PM" from a "14:00" 24h string. */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

/** "45 min" or "1 hr 30 min" from minutes. */
export function formatDuration(mins?: number | null) {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/**
 * Human label for a trip's dates: "Aug 23, 2026" for one day, or
 * "Aug 23 – 27, 2026" for a range, collapsing the repeated month and year.
 */
export function dateRangeLabel(startDate: string, endDate?: string): string {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
      ...opts,
      timeZone: "UTC",
    });

  const full: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (!endDate || endDate === startDate) return fmt(startDate, full);

  const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);

  if (sameMonth) {
    return `${fmt(startDate, { month: "short", day: "numeric" })} – ${fmt(endDate, { day: "numeric", year: "numeric" })}`;
  }
  if (sameYear) {
    return `${fmt(startDate, { month: "short", day: "numeric" })} – ${fmt(endDate, full)}`;
  }
  return `${fmt(startDate, full)} – ${fmt(endDate, full)}`;
}

/** Title-case a slug or label. */
export function titleCase(s: string) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

/**
 * Absolute origin for building auth redirect links. Prefers the configured
 * site URL and falls back to the current origin in the browser.
 */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
