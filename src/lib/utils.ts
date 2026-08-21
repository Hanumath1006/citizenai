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
