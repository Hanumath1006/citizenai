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
} from "lucide-react";
import type { PlannerInput } from "@/lib/types";
import type { PlannedItinerary } from "@/lib/ai/planner";
import { formatCostRange, formatDuration } from "@/lib/utils";
import {
  loadInput,
  loadResult,
  saveResult,
  type StoredResult,
} from "@/lib/plannerSession";
import { StopCard } from "@/components/itinerary/StopCard";
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
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: result.itinerary }),
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
          {it.input.city} · {it.input.date}
        </span>
        <WeatherBadge weather={it.weather} />
        {it.optimized && (
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-brand-soft px-3 py-1.5 text-brand">
            <Route className="h-3.5 w-3.5" />
            Route-optimized
            {it.totalTravelMin != null && it.totalTravelMin > 0
              ? ` · ${formatDuration(it.totalTravelMin)} travel`
              : ""}
          </span>
        )}
      </div>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
        {it.title}
      </h1>
      <p className="mt-2 text-muted">{it.summary}</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={MapPin} label="Stops" value={String(it.stops.length)} />
        <Stat
          icon={Clock}
          label="Duration"
          value={formatDuration(it.durationHours * 60)}
        />
        <Stat
          icon={Wallet}
          label="Est. cost"
          value={formatCostRange(it.estCostLow, it.estCostHigh)}
        />
      </div>

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
        {it.stops.map((stop, i) => (
          <StopCard
            key={`${stop.order}-${stop.name}`}
            stop={stop}
            isLast={i === it.stops.length - 1}
            city={it.input.city}
          />
        ))}
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
