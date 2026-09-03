import type { PlannerInput, WeatherSummary } from "@/lib/types";
import { BUDGET_LABELS, TRANSPORT_LABELS, tripDates } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import type { CallRecorder } from "@/lib/usage/types";

/** The itinerary "shape" the model produces, before venue enrichment. */
export interface PlannedStop {
  name: string;
  category: string;
  description: string;
  arriveTime: string; // HH:mm
  durationMin: number;
  costLow: number;
  costHigh: number;
  isIndoor: boolean;
  travelToNextMin: number;
}

export interface PlannedDay {
  dayIndex: number;
  date: string; // yyyy-mm-dd
  theme: string;
  stops: PlannedStop[];
}

export interface PlannedItinerary {
  title: string;
  summary: string;
  days: PlannedDay[];
}

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Gemini structured-output schema (OpenAPI subset). Constrains the response
 * so we get valid, parseable JSON without prompt-only coaxing.
 */
const STOP_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    category: { type: "STRING" },
    description: { type: "STRING" },
    arriveTime: { type: "STRING" },
    durationMin: { type: "INTEGER" },
    costLow: { type: "INTEGER" },
    costHigh: { type: "INTEGER" },
    isIndoor: { type: "BOOLEAN" },
    travelToNextMin: { type: "INTEGER" },
  },
  required: [
    "name",
    "category",
    "description",
    "arriveTime",
    "durationMin",
    "costLow",
    "costHigh",
    "isIndoor",
    "travelToNextMin",
  ],
  propertyOrdering: [
    "name",
    "category",
    "description",
    "arriveTime",
    "durationMin",
    "costLow",
    "costHigh",
    "isIndoor",
    "travelToNextMin",
  ],
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dayIndex: { type: "INTEGER" },
          date: { type: "STRING" },
          theme: { type: "STRING" },
          stops: { type: "ARRAY", items: STOP_SCHEMA },
        },
        required: ["dayIndex", "date", "theme", "stops"],
        propertyOrdering: ["dayIndex", "date", "theme", "stops"],
      },
    },
  },
  required: ["title", "summary", "days"],
  propertyOrdering: ["title", "summary", "days"],
};

function systemPrompt(dayCount: number) {
  const multiDay = dayCount > 1;

  return `You are CitizenAI, an expert local guide that designs optimized itineraries.

Your job is to turn a traveller's inputs into a realistic, well-paced, ordered itinerary of real, well-known venues that plausibly exist in the given city. Ground every stop in a specific named place a local would recognise — not a generic "a coffee shop". Another system will verify each venue against a live places database, so use real, findable names.

Rules for every day:
- Fit all of that day's stops inside the available time window. Sequence them so arrival times are chronological and account for the travel time between stops.
- arriveTime is 24-hour "HH:mm".
- CRITICAL — match every activity to the right part of the day, and only schedule a stop when that kind of venue is realistically open and makes sense:
    • Morning (before ~11:00): coffee, breakfast, bakeries, parks, morning markets.
    • Midday / afternoon: museums, galleries, shopping, sightseeing, lunch, tours, outdoor activities.
    • Evening (after ~17:00): dinner, bars, rooftops, live music, nightlife, clubs, shows.
  NEVER place an evening venue (bar, rooftop, live music, nightlife, club, late dinner) in the morning or early afternoon — these are closed then and it defeats the purpose. A jazz club at 8 AM is wrong.
- Assume typical opening hours: most venues are closed early morning and late at night. If the traveller's window starts very early or ends very late, simply don't schedule stops for the hours a fitting venue would be closed.
- Respect the budget level; keep the running cost within it. Give a realistic per-person cost range for each stop (0 for free stops).
- Tailor venue choices, pacing and tone to the travel style (solo / couple / family / friends) and the stated interests.
- Set isIndoor accurately. When the weather is poor, prefer indoor stops.
- Keep descriptions to 1-2 sentences, warm and specific, written to the traveller ("you").
- travelToNextMin is your best estimate of travel time to the following stop by the chosen transport mode; use 0 for each day's final stop.
- Typically 3-6 stops per day depending on the time window. Never invent hours the venue is unlikely to keep.
${
  multiDay
    ? `
This is a ${dayCount}-day trip. Additional rules that matter more than anything above:
- NEVER repeat a venue. Every single stop across all ${dayCount} days must be a different place. A traveller who sees the same restaurant twice will not trust the plan.
- Give each day its own centre of gravity — a different neighbourhood, district or theme — so the days feel distinct rather than interchangeable. The "theme" field is a short label for that, e.g. "Old town & harbour" or "Museums and the river".
- Group stops that are geographically close on the same day. Crossing the city twice in one trip is fine; crossing it twice in one day is not.
- Vary the intensity. A packed sightseeing day should be followed by something gentler, not another forced march.
- Put the marquee, unmissable attractions early in the trip. Weather and fatigue derail late days more often than early ones.
- Return exactly ${dayCount} day objects, with dayIndex 1..${dayCount} and the exact dates given, in order.`
    : `
This is a single-day outing. Return exactly one day object with dayIndex 1 and the date given.`
}`;
}

/** Pull a JSON object out of the model's text, tolerating stray fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

function userPrompt(
  input: PlannerInput,
  weatherByDate: Record<string, WeatherSummary>,
  refinement?: string,
  previous?: PlannedItinerary
) {
  const dates = tripDates(input.date, input.endDate);

  const dayLines = dates.map((d, i) => {
    const weekday = new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    const w = weatherByDate[d];
    const forecast =
      w?.isAvailable && w.condition
        ? ` — forecast: ${w.condition}, around ${w.tempF ?? "?"}°F`
        : "";
    return `  Day ${i + 1}: ${d} (${weekday})${forecast}`;
  });

  const lines = [
    `City: ${input.city}`,
    dates.length > 1
      ? `Trip: ${dates.length} days, ${input.date} to ${input.endDate}`
      : `Date: ${input.date}`,
    ...dayLines,
    `Available time each day: ${formatTime(input.timeStart)} to ${formatTime(input.timeEnd)}`,
    `Budget: ${BUDGET_LABELS[input.budget]} (per day)`,
    `Travelling as: ${input.travelStyle}`,
    `Getting around: ${TRANSPORT_LABELS[input.transport]}`,
    `Interests: ${input.interests.join(", ") || "open to anything"}`,
  ];

  if (refinement && previous) {
    return [
      "Here is the itinerary you produced previously:",
      JSON.stringify(previous, null, 2),
      "",
      "The traveller wants this change applied:",
      `"${refinement}"`,
      "",
      "Rebuild the full itinerary honoring that change while keeping everything else that already worked. Keep the same number of days and the same dates. Original inputs:",
      ...lines,
    ].join("\n");
  }

  return ["Design an itinerary for these inputs:", ...lines].join("\n");
}

/** Minimal shape of the Gemini generateContent response we rely on. */
interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  /** Token accounting — what the admin cost dashboard prices AI spend from. */
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

/**
 * Generate (or refine) an itinerary shape with Gemini.
 *
 * The whole trip is planned in ONE call rather than one call per day. Days
 * generated independently would happily send the traveller to the same
 * restaurant twice and cluster three neighbourhoods into one afternoon —
 * the model can only avoid repeats and spread the city out if it sees every
 * day at once. It is also N times cheaper.
 */
export async function planItinerary(
  input: PlannerInput,
  weatherByDate: Record<string, WeatherSummary>,
  opts?: {
    refinement?: string;
    previous?: PlannedItinerary;
    rec?: CallRecorder;
  }
): Promise<PlannedItinerary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const dates = tripDates(input.date, input.endDate);
  const dayCount = dates.length;
  const operation = opts?.refinement ? "refine_itinerary" : "plan_itinerary";
  const startedAt = Date.now();

  // Roughly 2,500 tokens buys one comfortable day of stops; the base covers
  // the title, summary and the model's own reasoning.
  const maxOutputTokens = Math.min(32768, 6144 + dayCount * 2500);

  const res = await fetch(ENDPOINT(MODEL()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt(dayCount) }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: userPrompt(
                input,
                weatherByDate,
                opts?.refinement,
                opts?.previous
              ),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens,
        temperature: 1,
      },
    }),
  });

  if (!res.ok) {
    opts?.rec?.recordGemini({
      operation,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - startedAt,
      ok: false,
      statusCode: res.status,
    });
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini request failed: ${detail}`);
  }

  const data = (await res.json()) as GeminiResponse;

  // Reasoning tokens are billed at the output rate, so they belong in
  // tokensOut — leaving them out understates AI spend on thinking models.
  const usage = data.usageMetadata;
  opts?.rec?.recordGemini({
    operation,
    tokensIn: usage?.promptTokenCount ?? 0,
    tokensOut:
      (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    latencyMs: Date.now() - startedAt,
    ok: true,
    statusCode: res.status,
  });

  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini blocked the request (${data.promptFeedback.blockReason}).`
    );
  }

  // Newer models interleave thinking metadata with output, so collect every
  // part that actually carries text rather than assuming it's the first one.
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason = data.candidates?.[0]?.finishReason;
    throw new Error(
      reason === "MAX_TOKENS"
        ? "That trip is too long to plan in one go — try a shorter date range."
        : reason
          ? `The planner returned no itinerary (${reason}).`
          : "The planner returned no itinerary."
    );
  }

  let parsed: PlannedItinerary;
  try {
    parsed = JSON.parse(extractJson(text)) as PlannedItinerary;
  } catch {
    throw new Error("The planner returned an unreadable itinerary.");
  }
  if (!parsed.days?.length) {
    throw new Error("The planner produced an empty itinerary.");
  }

  // The model can drift on dates or return the wrong number of days. Pin
  // both to what was actually asked for: the dates drive weather lookups and
  // opening-hours checks downstream, so a wrong one silently corrupts them.
  parsed.days = parsed.days
    .slice(0, dayCount)
    .map((day, i) => ({
      ...day,
      dayIndex: i + 1,
      date: dates[i],
      theme: day.theme?.trim() || `Day ${i + 1}`,
      stops: day.stops ?? [],
    }))
    .filter((day) => day.stops.length > 0);

  if (!parsed.days.length) {
    throw new Error("The planner produced an empty itinerary.");
  }

  return parsed;
}
