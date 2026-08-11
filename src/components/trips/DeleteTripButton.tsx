"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteTripButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/trips");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Delete this trip?</span>
        <button
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-[var(--radius-pill)] px-3 py-1.5 text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-red-600"
    >
      <Trash2 className="h-4 w-4" /> Delete
    </button>
  );
}
