"use client";

import type { Itinerary, PlannerInput } from "@/lib/types";
import type { PlannedItinerary } from "@/lib/ai/planner";

/* Hands a generated itinerary from the planner form to the result page
   without a round-trip, surviving a refresh via sessionStorage.

   Everything here is defensive on read. The stored payload is a snapshot of
   an app shape that changes between deploys, and sessionStorage outlives
   deploys: a browser tab open across a release will hand the new code a
   payload the old code wrote. When the itinerary moved from a flat `stops`
   array to `days[]`, a restored pre-release payload crashed the result page
   on render — the Save button never mounted, so saving appeared broken with
   no error and no network request to explain it.

   The fix is a version stamp plus a shape check. Anything that does not
   match is discarded and the itinerary is simply regenerated, which is a
   few seconds of work rather than a dead page. Bump STORAGE_VERSION
   whenever StoredResult or PlannerInput changes shape. */

const STORAGE_VERSION = 2;

const INPUT_KEY = "citizenai:planner:input";
const RESULT_KEY = "citizenai:planner:result";

export interface StoredResult {
  itinerary: Itinerary;
  plan: PlannedItinerary;
  /** Links the saved trip back to the generation that produced it. */
  generationId?: string | null;
}

interface Envelope<T> {
  v: number;
  data: T;
}

/** sessionStorage throws in some privacy modes; never let that break a render. */
function readEnvelope<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed?.v !== STORAGE_VERSION) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, data }));
  } catch {
    // Quota or a locked-down browser — the planner still works, it just
    // regenerates instead of restoring on refresh.
  }
}

/** Shape guards. A version match alone is not proof the payload is usable. */
function isPlannerInput(value: unknown): value is PlannerInput {
  const v = value as PlannerInput | null;
  return Boolean(
    v && typeof v.city === "string" && typeof v.date === "string"
  );
}

function isStoredResult(value: unknown): value is StoredResult {
  const v = value as StoredResult | null;
  return Boolean(
    v &&
      v.itinerary &&
      Array.isArray(v.itinerary.days) &&
      v.itinerary.days.length > 0 &&
      v.itinerary.days.every((d) => Array.isArray(d?.stops))
  );
}

export function saveInput(input: PlannerInput) {
  writeEnvelope(INPUT_KEY, input);
}

export function loadInput(): PlannerInput | null {
  const data = readEnvelope<PlannerInput>(INPUT_KEY);
  if (!isPlannerInput(data)) return null;
  // endDate arrived with multi-day trips; treat a missing one as a day trip
  // rather than discarding an otherwise valid input.
  return { ...data, endDate: data.endDate || data.date };
}

export function saveResult(result: StoredResult) {
  writeEnvelope(RESULT_KEY, result);
}

export function loadResult(): StoredResult | null {
  const data = readEnvelope<StoredResult>(RESULT_KEY);
  return isStoredResult(data) ? data : null;
}

export function clearResult() {
  try {
    sessionStorage.removeItem(RESULT_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
