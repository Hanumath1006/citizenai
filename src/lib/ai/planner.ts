import type { PlannerInput, WeatherSummary } from "@/lib/types";
import { BUDGET_LABELS, TRANSPORT_LABELS } from "@/lib/types";
import { formatTime } from "@/lib/utils";

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

export interface PlannedItinerary {
  title: string;
  summary: string;
  stops: PlannedStop[];
}

const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.6-flash";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Gemini structured-output schema (OpenAPI subset). Constrains the response
 * so we get valid, parseable JSON without prompt-only coaxing.
 */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    stops: {
      type: "ARRAY",
      items: {
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
      },
    },
  },
  required: ["title", "summary", "stops"],
  propertyOrdering: ["title", "summary", "stops"],
};

function systemPrompt() {
  return `You are CitizenAI, an expert local guide that designs optimized single-day outings.

Your job is to turn a traveller's inputs into a realistic, well-paced, ordered itinerary of real, well-known venues that plausibly exist in the given city. Ground every stop in a specific named place a local would recognise — not a generic "a coffee shop". Another system will verify each venue against a live places database, so use real, findable names.

Rules:
- Fit all stops inside the available time window. Sequence them so arrival times are chronological and account for the travel time between stops.
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
- travelToNextMin is your best estimate of travel time to the following stop by the chosen transport mode; use 0 for the final stop.
- Typically produce 3-6 stops depending on the time window. Never invent hours the venue is unlikely to keep.`;
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
  weather: WeatherSummary,
  refinement?: string,
  previous?: PlannedItinerary
) {
  const weekday = new Date(`${input.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const lines = [
    `City: ${input.city}`,
    `Date: ${input.date} (${weekday})`,
    `Time window: ${formatTime(input.timeStart)} to ${formatTime(input.timeEnd)}`,
    `Budget: ${BUDGET_LABELS[input.budget]}`,
    `Travelling as: ${input.travelStyle}`,
    `Getting around: ${TRANSPORT_LABELS[input.transport]}`,
    `Interests: ${input.interests.join(", ") || "open to anything"}`,
  ];
  if (weather.isAvailable) {
    lines.push(
      `Forecast for the day: ${weather.condition ?? "unknown"}, around ${weather.tempF ?? "?"}°F.`
    );
  }

  if (refinement && previous) {
    return [
      "Here is the itinerary you produced previously:",
      JSON.stringify(previous, null, 2),
      "",
      "The traveller wants this change applied:",
      `"${refinement}"`,
      "",
      "Rebuild the full itinerary honoring that change while keeping everything else that already worked. Original inputs:",
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
  error?: { message?: string };
}

/** Generate (or refine) an itinerary shape with Gemini. */
export async function planItinerary(
  input: PlannerInput,
  weather: WeatherSummary,
  opts?: { refinement?: string; previous?: PlannedItinerary }
): Promise<PlannedItinerary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const res = await fetch(ENDPOINT(MODEL()), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt() }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: userPrompt(
                input,
                weather,
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
        maxOutputTokens: 8192,
        temperature: 1,
      },
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GeminiResponse;
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini request failed: ${detail}`);
  }

  const data = (await res.json()) as GeminiResponse;

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
      reason
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
  if (!parsed.stops?.length) {
    throw new Error("The planner produced an empty itinerary.");
  }
  return parsed;
}
