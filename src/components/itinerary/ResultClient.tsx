"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Clock,
  Wallet,
  Bookmark,
  Check,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Route,
  CalendarDays,
} from "lucide-react";
import type { PlannerInput } from "@/lib/types";
import { isOptimized, totalTravelMin } from "@/lib/types";
import type { PlannedItinerary } from "@/lib/ai/planner";
import { formatCostRange, formatDuration, dateRangeLabel } from "@/lib/utils";
import {
  loadInput,
  loadResult,
  saveResult,
  type StoredResult,
} from "@/lib/plannerSession";
import {
  DayItinerary,
  DayNav,
} from "@/components/itinerary/DayItinerary";
import { RefinementBar } from "@/components/itinerary/RefinementBar";
import { WeatherBadge } from "@/components/itinerary/WeatherBadge";
import { Button } from "@/components/ui/Button";

type Phase = "loading" | "ready" | "error";

export function ResultClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StoredResult | null>(null);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const inputRef = useRef<PlannerInput | null>(null);
  const started = useRef(false);
  const [favoritedPlaceIds, setFavoritedPlaceIds] = useState<Set<string>>(
    new Set()
  );
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());

  const generate = useCallback(
    async (input: PlannerInput, refinement?: string, previous?: PlannedItinerary) => {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, refinement, previous }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate itinerary.");
      }
      return (await res.json()) as StoredResult;
    },
    []
  );

  // Initial load: use cached result if present, otherwise generate.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const input = loadInput();
    if (!input) {
      router.replace("/plan");
      return;
    }
    inputRef.current = input;

    const cached = loadResult();
    if (cached) {
      setResult(cached);
      setPhase("ready");
      return;
    }

    generate(input)
      .then((r) => {
        saveResult(r);
        setResult(r);
        setPhase("ready");
      })
      .catch((e: Error) => {
        setError(e.message);
        setPhase("error");
      });
  }, [generate, router]);

  // Which venues the traveller has already bookmarked, so the hearts on a
  // freshly generated itinerary reflect reality. Best-effort: a failure here
  // just means the controls start empty, which is recoverable by clicking.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const load = async (kind: "favorites" | "saved") => {
        try {
          const res = await fetch(`/api/bookmarks?kind=${kind}`);
          if (!res.ok) return new Set<string>();
          const { placeIds } = (await res.json()) as { placeIds: string[] };
          return new Set(placeIds ?? []);
        } catch {
          return new Set<string>();
        }
      };
      const [favs, saves] = await Promise.all([load("favorites"), load("saved")]);
      if (cancelled) return;
      setFavoritedPlaceIds(favs);
      setSavedPlaceIds(saves);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refine(text: string) {
    if (!inputRef.current || !result) return;
    setRefining(true);
    setError(null);
    try {
      const r = await generate(inputRef.current, text, result.plan);
      saveResult(r);
      setResult(r);
      setSaved(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefining(false);
    }
  }

  async function retry() {
    if (!inputRef.current) return;
    setPhase("loading");
    setError(null);
    try {
      const r = await generate(inputRef.current);
      saveResult(r);
      setResult(r);
      setPhase("ready");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  async function save() {
    // Never fail silently here. A click that does nothing, with no message
    // and no network request, is indistinguishable from a broken button.
    if (!result?.itinerary?.days?.length) {
      setError("This itinerary is no longer loaded — generate it again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary: result.itinerary,
          generationId: result.generationId ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save.");
      }
      const { id } = (await res.json()) as { id: string };
      setSaved(id);
      router.push(`/trips/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (phase === "loading") return <GeneratingState />;

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="text-xl font-semibold">We hit a snag</h1>
        <p className="mt-2 text-muted">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" href="/plan">
            <ArrowLeft className="h-4 w-4" /> Back to planner
          </Button>
          <Button onClick={retry}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  const it = result!.itinerary;
  const multiDay = it.days.length > 1;
  const stopCount = it.days.reduce((n, d) => n + d.stops.length, 0);
  const tripOptimized = isOptimized(it);
  const travelMin = totalTravelMin(it);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <button
        onClick={() => router.push("/plan")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to planner
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-faint">
        <span className="uppercase tracking-wide">
          {it.input.city} · {dateRangeLabel(it.input.date, it.input.endDate)}
        </span>
        {!multiDay && <WeatherBadge weather={it.weather} />}
        {tripOptimized && (
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-brand-soft px-3 py-1.5 text-brand">
            <Route className="h-3.5 w-3.5" />
            Route-optimized
            {travelMin > 0 ? ` · ${formatDuration(travelMin)} travel` : ""}
          </span>
        )}
      </div>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
        {it.title}
      </h1>
      <p className="mt-2 text-muted">{it.summary}</p>

      {/* Stats */}
      <div
        className={`mt-6 grid gap-3 ${multiDay ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
      >
        {multiDay && (
          <Stat icon={CalendarDays} label="Days" value={String(it.days.length)} />
        )}
        <Stat icon={MapPin} label="Stops" value={String(stopCount)} />
        <Stat
          icon={Clock}
          label={multiDay ? "Hours/day" : "Duration"}
          value={formatDuration(it.durationHours * 60)}
        />
        <Stat
          icon={Wallet}
          label={multiDay ? "Est. total" : "Est. cost"}
          value={formatCostRange(it.estCostLow, it.estCostHigh)}
        />
      </div>

      {multiDay && (
        <div className="mt-6">
          <DayNav days={it.days} />
        </div>
      )}

      {/* Refinement */}
      <div className="mt-6">
        <RefinementBar onRefine={refine} busy={refining} />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Stops */}
      <div className="relative mt-8">
        {refining && (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-canvas/60 pt-16 backdrop-blur-sm">
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" /> Rebuilding your plan…
            </span>
          </div>
        )}
        <div className="space-y-10">
          {it.days.map((day) => (
            <DayItinerary
              key={day.dayIndex}
              day={day}
              city={it.input.city}
              showHeader={multiDay}
              favoritedPlaceIds={favoritedPlaceIds}
              savedPlaceIds={savedPlaceIds}
            />
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="sticky bottom-4 mt-2 flex justify-center">
        <Button
          size="lg"
          onClick={save}
          disabled={saving || !!saved}
          className="shadow-[var(--shadow-float)]"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" /> Save this trip
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-faint" />
      <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="mx-auto max-w-md px-5 py-28 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </span>
      <h1 className="mt-6 text-xl font-semibold">Building your outing…</h1>
      <p className="mt-2 text-muted">
        Sequencing real venues, timing and travel — this takes a few seconds.
      </p>
    </div>
  );
}
