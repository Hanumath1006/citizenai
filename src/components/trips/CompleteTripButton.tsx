"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Marking an outing done — moves it out of Upcoming and into Recent.

   Two presentations over one behaviour:
     · CompleteTripButton — the panel at the foot of an itinerary
     · TripDoneToggle     — the compact pill on a trip card

   Marking a trip done is a one-click, fully reversible state change, so
   neither asks for confirmation. The cost of a misclick is one more click,
   and a confirm dialog on something this cheap is just friction.
   ────────────────────────────────────────────────────────────── */

export type TripStatus = "upcoming" | "completed";

/** Shared mutation: PATCH the status, then let the server re-render. */
function useTripStatus(id: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: TripStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not update this trip.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setStatus };
}

/**
 * Compact toggle for a trip card.
 *
 * The card is a stretched link, so this stops propagation and cancels the
 * default navigation — otherwise marking a trip done would also open it.
 */
export function TripDoneToggle({
  id,
  status,
  className,
}: {
  id: string;
  status: TripStatus;
  className?: string;
}) {
  const { busy, error, setStatus } = useTripStatus(id);
  const done = status === "completed";

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setStatus(done ? "upcoming" : "completed");
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      title={error ?? (done ? "Move back to upcoming" : "Mark this trip done")}
      aria-label={done ? "Move trip back to upcoming" : "Mark trip done"}
      className={cn(
        "group/done relative z-20 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 text-xs font-medium transition-all disabled:opacity-60",
        done
          ? "border-line bg-surface-raised text-muted hover:border-ink/30 hover:text-ink"
          : "border-ink bg-ink text-white hover:bg-ink-soft",
        error && "border-red-300 text-red-600",
        className
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : done ? (
        <RotateCcw className="h-3.5 w-3.5 transition-transform duration-200 group-hover/done:-rotate-45" />
      ) : (
        <Check
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover/done:scale-125"
          strokeWidth={3}
        />
      )}
      {done ? "Undo" : "Mark done"}
    </button>
  );
}

/**
 * Full-width panel for the foot of an itinerary. You reach it by scrolling
 * past the last stop, which is the moment the action makes sense.
 */
export function CompleteTripButton({
  id,
  status,
}: {
  id: string;
  status: TripStatus;
}) {
  const { busy, error, setStatus } = useTripStatus(id);
  const done = status === "completed";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border p-5 transition-colors",
        done
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-line bg-surface shadow-[var(--shadow-card)]"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
              done ? "bg-emerald-600 text-white" : "bg-line-soft text-faint"
            )}
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
          <div>
            <p className="font-medium">
              {done ? "Trip completed" : "That's the whole day"}
            </p>
            <p className="text-sm text-muted">
              {done
                ? "Filed under your recent trips."
                : "Been on this outing? Mark it done to move it out of Upcoming."}
            </p>
          </div>
        </div>

        {done ? (
          <button
            onClick={() => setStatus("upcoming")}
            disabled={busy}
            className="group inline-flex h-10 items-center gap-2 rounded-[var(--radius-pill)] border border-emerald-200 bg-surface-raised px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-45" />
            )}
            Undo
          </button>
        ) : (
          <button
            onClick={() => setStatus("completed")}
            disabled={busy}
            className="group inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-5 text-sm font-medium text-white shadow-[var(--shadow-raise)] transition-all hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check
                className="h-4 w-4 transition-transform duration-200 group-hover:scale-125"
                strokeWidth={3}
              />
            )}
            Mark done
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
