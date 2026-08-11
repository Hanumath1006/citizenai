/* ──────────────────────────────────────────────────────────────
   Opening-hours reasoning over Google Places `regularOpeningHours`.
   Days are 0=Sunday … 6=Saturday (Google's convention). Times are
   handled on a weekly minute axis so overnight and cross-day periods
   (e.g. a club open Fri 20:00 → Sat 02:00) resolve correctly.
   ────────────────────────────────────────────────────────────── */

import type { OpeningPeriod } from "@/lib/google/places";

const WEEK = 7 * 24 * 60; // minutes in a week

function weekMinute(day: number, hour: number, minute: number) {
  return day * 24 * 60 + hour * 60 + minute;
}

/**
 * Is the venue open at `minutes` past midnight on `weekday`?
 * Returns true/false, or null when hours are unknown (don't penalize).
 */
export function isOpenAt(
  periods: OpeningPeriod[] | null | undefined,
  weekday: number,
  minutes: number
): boolean | null {
  if (!periods || periods.length === 0) return null;

  // 24/7 marker: a single period opening Sunday 00:00 with no close.
  if (
    periods.length === 1 &&
    !periods[0].close &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0
  ) {
    return true;
  }

  const q = weekMinute(weekday, Math.floor(minutes / 60), minutes % 60);

  for (const p of periods) {
    const start = weekMinute(p.open.day, p.open.hour, p.open.minute);
    if (!p.close) continue; // open-ended non-24/7 entry: skip (ambiguous)
    let end = weekMinute(p.close.day, p.close.hour, p.close.minute);
    if (end <= start) end += WEEK; // wraps past the week boundary

    // Check the query at its position and one week later (to catch
    // early-morning times that belong to the previous day's period).
    if ((q >= start && q < end) || (q + WEEK >= start && q + WEEK < end)) {
      return true;
    }
  }
  return false;
}

/**
 * Human-readable hours for a given weekday, from Google's Monday-first
 * `weekdayDescriptions`, e.g. "Open 5:00 PM – 2:00 AM". Null if unknown.
 */
export function dayHoursText(
  weekdayText: string[] | null | undefined,
  weekday: number
): string | null {
  if (!weekdayText || weekdayText.length < 7) return null;
  // Google order is Monday(0) … Sunday(6); JS weekday is Sunday(0) … Saturday(6).
  const idx = (weekday + 6) % 7;
  const raw = weekdayText[idx];
  if (!raw) return null;
  const afterColon = raw.split(": ").slice(1).join(": ").trim();
  if (!afterColon) return null;
  if (/closed/i.test(afterColon)) return "Closed today";
  if (/24 hours/i.test(afterColon)) return "Open 24 hours";
  return `Open ${afterColon}`;
}

/** "HH:mm" → minutes past midnight. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (m || 0);
}
