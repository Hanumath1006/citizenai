"use client";

import type { Itinerary, PlannerInput } from "@/lib/types";
import type { PlannedItinerary } from "@/lib/ai/planner";

/* Hands a generated itinerary from the planner form to the result page
   without a round-trip, surviving a refresh via sessionStorage. */

const INPUT_KEY = "citizenai:planner:input";
const RESULT_KEY = "citizenai:planner:result";

export interface StoredResult {
  itinerary: Itinerary;
  plan: PlannedItinerary;
}

export function saveInput(input: PlannerInput) {
  sessionStorage.setItem(INPUT_KEY, JSON.stringify(input));
}
export function loadInput(): PlannerInput | null {
  const raw = sessionStorage.getItem(INPUT_KEY);
  return raw ? (JSON.parse(raw) as PlannerInput) : null;
}

export function saveResult(result: StoredResult) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}
export function loadResult(): StoredResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  return raw ? (JSON.parse(raw) as StoredResult) : null;
}
export function clearResult() {
  sessionStorage.removeItem(RESULT_KEY);
}
