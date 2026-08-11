"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Clock, Sparkles } from "lucide-react";
import {
  INTERESTS,
  BUDGET_LABELS,
  TRANSPORT_LABELS,
  type Budget,
  type Transport,
  type TravelStyle,
  type PlannerInput,
} from "@/lib/types";
import { Label, Input, Select, Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { saveInput, clearResult } from "@/lib/plannerSession";
import { cn } from "@/lib/utils";

const TRANSPORTS: Transport[] = ["walking", "driving", "uber", "public"];

export function PlannerForm({
  defaults,
}: {
  defaults?: Partial<PlannerInput> & { city?: string };
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [city, setCity] = useState(defaults?.city ?? "");
  const [date, setDate] = useState(defaults?.date ?? today);
  const [timeStart, setTimeStart] = useState(defaults?.timeStart ?? "14:00");
  const [timeEnd, setTimeEnd] = useState(defaults?.timeEnd ?? "20:00");
  const [budget, setBudget] = useState<Budget>(defaults?.budget ?? "moderate");
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    defaults?.travelStyle ?? "couple"
  );
  const [transport, setTransport] = useState<Transport>(
    defaults?.transport ?? "walking"
  );
  const [interests, setInterests] = useState<string[]>(
    defaults?.interests ?? ["Coffee", "Food & Dining"]
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleInterest(i: string) {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!city.trim()) return setError("Please enter a city.");
    if (timeEnd <= timeStart)
      return setError("End time must be after start time.");

    const input: PlannerInput = {
      city: city.trim(),
      date,
      timeStart,
      timeEnd,
      budget,
      travelStyle,
      transport,
      interests,
    };
    setSubmitting(true);
    saveInput(input);
    clearResult();
    router.push("/plan/result");
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {/* Where */}
      <div className="space-y-2">
        <Label>
          <MapPin className="h-3.5 w-3.5" /> Where to?
        </Label>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Barcelona, Dallas, Tokyo"
          autoFocus
        />
      </div>

      {/* Date + time */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            <Calendar className="h-3.5 w-3.5" /> Date
          </Label>
          <Input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>
            <Clock className="h-3.5 w-3.5" /> Available time
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
            />
            <span className="text-faint">—</span>
            <Input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Budget + travel style */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Budget</Label>
          <Select
            value={budget}
            onChange={(e) => setBudget(e.target.value as Budget)}
          >
            {(Object.keys(BUDGET_LABELS) as Budget[]).map((b) => (
              <option key={b} value={b}>
                {BUDGET_LABELS[b]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Travelling as</Label>
          <Select
            value={travelStyle}
            onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
          >
            <option value="solo">Solo</option>
            <option value="couple">Couple</option>
            <option value="family">Family</option>
            <option value="friends">Friends</option>
          </Select>
        </div>
      </div>

      {/* Getting around */}
      <div className="space-y-2.5">
        <Label>Getting around</Label>
        <div className="flex flex-wrap gap-2">
          {TRANSPORTS.map((t) => (
            <Pill
              key={t}
              active={transport === t}
              onClick={() => setTransport(t)}
            >
              {TRANSPORT_LABELS[t]}
            </Pill>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-2.5">
        <Label>
          <Sparkles className="h-3.5 w-3.5" /> Interests
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Pill key={i} active={interests.includes(i)} onClick={() => toggleInterest(i)}>
              {i}
            </Pill>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className={cn("flex justify-end pt-2")}>
        <Button type="submit" size="lg" disabled={submitting}>
          <Sparkles className="h-4 w-4" />
          {submitting ? "Generating…" : "Generate my outing"}
        </Button>
      </div>
    </form>
  );
}
