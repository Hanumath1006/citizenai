"use client";

import { useState } from "react";
import { Wand2, ArrowRight } from "lucide-react";
import { REFINEMENTS } from "@/lib/types";
import { Pill } from "@/components/ui/primitives";

export function RefinementBar({
  onRefine,
  busy,
}: {
  onRefine: (text: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");

  function submitFree(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (t && !busy) {
      onRefine(t);
      setText("");
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Wand2 className="h-4 w-4 text-brand" />
        Change this plan
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {REFINEMENTS.map((r) => (
          <Pill key={r} onClick={() => !busy && onRefine(r)} disabled={busy}>
            {r}
          </Pill>
        ))}
      </div>

      <form onSubmit={submitFree} className="mt-4 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or tell the AI exactly what to change…"
          disabled={busy}
          className="h-11 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm placeholder:text-faint focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-ink-soft disabled:opacity-40"
          aria-label="Apply change"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
