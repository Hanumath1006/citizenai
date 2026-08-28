import { format, formatDistanceToNowStrict } from "date-fns";

/** "May 26, 2025" */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/** "May 26, 2025 10:21 AM" */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

/** "2h ago", "3d ago", or "Never". */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return "—";
  }
}

/** 1284 → "1,284"; 12800 → "12.8k" once past five figures. */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 10_000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return n.toLocaleString("en-US");
}

/** 0.62 → "62%" */
export function percent(share: number | undefined, digits = 0): string {
  if (share == null || !Number.isFinite(share)) return "—";
  return `${(share * 100).toFixed(digits)}%`;
}

/** "1.4s" / "820ms" */
export function duration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Chart axis label: "May 26" from "2025-05-26" (parsed as UTC, not local). */
export function axisDate(isoDay: string): string {
  try {
    return format(new Date(`${isoDay}T12:00:00Z`), "MMM d");
  } catch {
    return isoDay;
  }
}

/**
 * Percentage change between two periods, or null when the baseline is zero —
 * "+100% vs last week" off a base of nothing is noise, not a trend.
 */
export function trend(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
