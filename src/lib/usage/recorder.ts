/* ──────────────────────────────────────────────────────────────
   Usage recorder — collects one row per outbound third-party call
   during an itinerary generation, then writes them in a single batch.

   Two rules govern everything here:

     1. Telemetry never breaks generation. Every write is wrapped; a
        failure logs and is swallowed. A user must never see an error
        because we could not record a metric.
     2. Telemetry never slows generation. Events accumulate in memory
        and flush once at the end (2 inserts total), rather than doing a
        round-trip per API call.
   ────────────────────────────────────────────────────────────── */

import { createServiceClient } from "@/lib/supabase/server";
import { PRICING, geminiCost, type Provider } from "@/lib/usage/pricing";
import type { CallRecorder } from "@/lib/usage/types";
import type { PlannerInput } from "@/lib/types";
import { tripDayCount } from "@/lib/types";

export interface ApiEventDraft {
  provider: Provider;
  operation: string;
  units?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd: number;
  latencyMs?: number;
  ok?: boolean;
  statusCode?: number;
}

/** True once we have warned that the telemetry tables are missing. */
let warnedMissingTables = false;

function telemetryEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function noteFailure(scope: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (/relation .* does not exist|schema cache/i.test(message)) {
    if (!warnedMissingTables) {
      warnedMissingTables = true;
      console.warn(
        `[usage] telemetry tables not found — run supabase/migrations/0002_admin_and_usage.sql. (${scope})`
      );
    }
    return;
  }
  console.error(`[usage] ${scope} failed:`, message);
}

export class UsageRecorder implements CallRecorder {
  private events: ApiEventDraft[] = [];
  private startedAt = Date.now();

  constructor(private userId: string | null) {}

  /** Record one API call. Cost is computed by the caller-facing helpers below. */
  record(event: ApiEventDraft) {
    this.events.push(event);
  }

  /** Gemini call, priced from the model's own reported token counts. */
  recordGemini(args: {
    operation: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    ok: boolean;
    statusCode?: number;
  }) {
    this.record({
      provider: "gemini",
      operation: args.operation,
      units: 1,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
      costUsd: geminiCost(args.tokensIn, args.tokensOut),
      latencyMs: args.latencyMs,
      ok: args.ok,
      statusCode: args.statusCode,
    });
  }

  /** A fixed-rate call (Places, Routes, Weather). */
  recordFlat(args: {
    provider: Provider;
    operation: string;
    unitPrice: number;
    units?: number;
    latencyMs?: number;
    ok?: boolean;
    statusCode?: number;
  }) {
    const units = args.units ?? 1;
    this.record({
      provider: args.provider,
      operation: args.operation,
      units,
      // A failed call is not billed, so it costs nothing but is still counted.
      costUsd: args.ok === false ? 0 : args.unitPrice * units,
      latencyMs: args.latencyMs,
      ok: args.ok ?? true,
      statusCode: args.statusCode,
    });
  }

  /** Running total across everything recorded so far. */
  get totalCost(): number {
    return this.events.reduce((sum, e) => sum + e.costUsd, 0);
  }

  get eventCount(): number {
    return this.events.length;
  }

  /**
   * Persist the generation and its API events. Returns the generation id,
   * or null if telemetry is unavailable. Safe to call exactly once.
   */
  async flush(meta: {
    input: PlannerInput;
    stopCount?: number;
    /** Days planned. The biggest single driver of what a generation costs. */
    dayCount?: number;
    refined?: boolean;
    ok: boolean;
    error?: string;
  }): Promise<string | null> {
    if (!telemetryEnabled()) return null;

    try {
      const supabase = createServiceClient();

      const { data: generation, error: genError } = await supabase
        .from("generations")
        .insert({
          user_id: this.userId,
          city: meta.input.city,
          trip_date: meta.input.date,
          end_date: meta.input.endDate || meta.input.date,
          day_count:
            meta.dayCount ??
            tripDayCount(meta.input.date, meta.input.endDate || meta.input.date),
          budget: meta.input.budget,
          travel_style: meta.input.travelStyle,
          transport: meta.input.transport,
          interests: meta.input.interests,
          stop_count: meta.stopCount ?? null,
          refined: meta.refined ?? false,
          ok: meta.ok,
          error: meta.error?.slice(0, 500) ?? null,
          duration_ms: Date.now() - this.startedAt,
          cost_usd: this.totalCost,
        })
        .select("id")
        .single();

      if (genError) throw genError;

      if (this.events.length) {
        const { error: eventsError } = await supabase.from("api_events").insert(
          this.events.map((e) => ({
            generation_id: generation.id,
            user_id: this.userId,
            provider: e.provider,
            operation: e.operation,
            units: e.units ?? 1,
            tokens_in: e.tokensIn ?? 0,
            tokens_out: e.tokensOut ?? 0,
            cost_usd: e.costUsd,
            latency_ms: e.latencyMs ?? null,
            ok: e.ok ?? true,
            status_code: e.statusCode ?? null,
          }))
        );
        if (eventsError) throw eventsError;
      }

      return generation.id as string;
    } catch (err) {
      noteFailure("flush", err);
      return null;
    }
  }

  /**
   * Link a saved trip back to the generation that produced it, which is what
   * makes a generation→save conversion rate computable.
   *
   * The generation id arrives from the browser, so the update is scoped to the
   * caller's own user_id: a forged id cannot touch someone else's row.
   */
  static async attachTrip(
    generationId: string,
    tripId: string,
    userId: string
  ) {
    if (!telemetryEnabled()) return;
    try {
      const supabase = createServiceClient();
      await supabase
        .from("generations")
        .update({ trip_id: tripId })
        .eq("id", generationId)
        .eq("user_id", userId);
    } catch (err) {
      noteFailure("attachTrip", err);
    }
  }
}

/**
 * Record a single standalone API call that is not part of a generation —
 * currently just the photo proxy, which is hit lazily by the browser long
 * after the itinerary was built. Fire-and-forget.
 */
export async function recordStandaloneCall(args: {
  provider: Provider;
  operation: string;
  unitPrice: number;
  units?: number;
  latencyMs?: number;
  ok?: boolean;
  statusCode?: number;
}) {
  if (!telemetryEnabled()) return;
  const units = args.units ?? 1;
  try {
    const supabase = createServiceClient();
    await supabase.from("api_events").insert({
      provider: args.provider,
      operation: args.operation,
      units,
      cost_usd: args.ok === false ? 0 : args.unitPrice * units,
      latency_ms: args.latencyMs ?? null,
      ok: args.ok ?? true,
      status_code: args.statusCode ?? null,
    });
  } catch (err) {
    noteFailure("standalone", err);
  }
}

export { PRICING };
