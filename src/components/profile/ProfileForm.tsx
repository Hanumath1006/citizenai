"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  INTERESTS,
  BUDGET_LABELS,
  TRANSPORT_LABELS,
  type Budget,
  type Transport,
  type TravelStyle,
} from "@/lib/types";
import type { ProfileRow } from "@/lib/supabase/database.types";
import { Label, Input, Select, Pill } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";

const TRANSPORTS: Transport[] = ["walking", "driving", "uber", "public"];

export function ProfileForm({ profile }: { profile: ProfileRow | null }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [homeCity, setHomeCity] = useState(profile?.home_city ?? "");
  const [budget, setBudget] = useState<Budget | "">(
    (profile?.default_budget as Budget) ?? ""
  );
  const [style, setStyle] = useState<TravelStyle | "">(
    (profile?.default_style as TravelStyle) ?? ""
  );
  const [transport, setTransport] = useState<Transport | "">(
    (profile?.default_transport as Transport) ?? ""
  );
  const [interests, setInterests] = useState<string[]>(
    profile?.default_interests ?? []
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(i: string) {
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    setDone(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName || null,
        home_city: homeCity || null,
        default_budget: budget || null,
        default_style: style || null,
        default_transport: transport || null,
        default_interests: interests,
      }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError("Could not save your changes.");
  }

  return (
    <div className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setDone(false);
            }}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label>Home city</Label>
          <Input
            value={homeCity}
            onChange={(e) => {
              setHomeCity(e.target.value);
              setDone(false);
            }}
            placeholder="e.g. Dallas"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Default budget</Label>
          <Select
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value as Budget);
              setDone(false);
            }}
          >
            <option value="">No preference</option>
            {(Object.keys(BUDGET_LABELS) as Budget[]).map((b) => (
              <option key={b} value={b}>
                {BUDGET_LABELS[b]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Default travel style</Label>
          <Select
            value={style}
            onChange={(e) => {
              setStyle(e.target.value as TravelStyle);
              setDone(false);
            }}
          >
            <option value="">No preference</option>
            <option value="solo">Solo</option>
            <option value="couple">Couple</option>
            <option value="family">Family</option>
            <option value="friends">Friends</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2.5">
        <Label>Default transport</Label>
        <div className="flex flex-wrap gap-2">
          {TRANSPORTS.map((t) => (
            <Pill
              key={t}
              active={transport === t}
              onClick={() => {
                setTransport(transport === t ? "" : t);
                setDone(false);
              }}
            >
              {TRANSPORT_LABELS[t]}
            </Pill>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <Label>Default interests</Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Pill key={i} active={interests.includes(i)} onClick={() => toggle(i)}>
              {i}
            </Pill>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : done ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save preferences"
          )}
        </Button>
        {done && <span className="text-sm text-muted">Your defaults are updated.</span>}
      </div>
    </div>
  );
}
