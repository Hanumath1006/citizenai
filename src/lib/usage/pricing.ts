/* ──────────────────────────────────────────────────────────────
   Cost model for the admin usage dashboard.

   These are LIST-PRICE ESTIMATES, not billed amounts. They exist so the
   dashboard can answer "what does an itinerary cost to generate?" without
   scraping four different billing consoles. Two caveats worth knowing when
   reading the numbers:

     · Free-tier credits are NOT deducted. Google Maps and Gemini both have
       monthly free allowances, so early real invoices will be lower than
       what this reports.
     · Vendor prices change. Every rate below can be overridden with an env
       var so a price change is a config edit, not a redeploy of logic.

   Rates last reviewed: February 2026.
   ────────────────────────────────────────────────────────────── */

function rate(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const PRICING = {
  /** Gemini Flash, USD per 1M tokens. */
  get geminiInputPerMTok() {
    return rate("PRICE_GEMINI_INPUT_PER_MTOK", 0.3);
  },
  get geminiOutputPerMTok() {
    return rate("PRICE_GEMINI_OUTPUT_PER_MTOK", 2.5);
  },
  /** Places API (New) Text Search, Pro SKU — we request rating/hours/photos. */
  get placesTextSearch() {
    return rate("PRICE_PLACES_TEXT_SEARCH", 0.032);
  },
  /** Places Photo media fetch. */
  get placesPhoto() {
    return rate("PRICE_PLACES_PHOTO", 0.007);
  },
  /** Routes API — per element for a matrix, per call for a single route. */
  get routesElement() {
    return rate("PRICE_ROUTES_ELEMENT", 0.005);
  },
  /** OpenWeather free tier. Set the env var if you move to a paid plan. */
  get weatherCall() {
    return rate("PRICE_WEATHER_CALL", 0);
  },
};

/** USD cost of one Gemini call from its reported token usage. */
export function geminiCost(tokensIn: number, tokensOut: number): number {
  return (
    (tokensIn / 1_000_000) * PRICING.geminiInputPerMTok +
    (tokensOut / 1_000_000) * PRICING.geminiOutputPerMTok
  );
}

/** Provider labels + accent colors shared by the admin usage views. */
export const PROVIDER_META = {
  gemini: { label: "AI Service", tint: "#6d5efc" },
  places: { label: "Maps API", tint: "#2b8ef7" },
  routes: { label: "Routes API", tint: "#12a594" },
  weather: { label: "Weather API", tint: "#e8722c" },
} as const;

export type Provider = keyof typeof PROVIDER_META;

/** Format a USD amount for display, keeping sub-cent precision readable. */
export function formatUsd(n: number, opts?: { precise?: boolean }): string {
  if (!Number.isFinite(n)) return "$0.00";
  if (opts?.precise) {
    if (n === 0) return "$0.000";
    if (n < 0.001) return `$${n.toExponential(1)}`;
    return `$${n.toFixed(3)}`;
  }
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
