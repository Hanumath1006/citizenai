"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Dialog = "disable" | "enable" | "delete";

/**
 * Disable / re-enable / delete controls for one account.
 *
 * Both destructive paths go through an explicit confirmation, and deletion
 * additionally requires typing DELETE — it removes the user's trips and
 * saved places along with the account and cannot be undone.
 */
export function UserActions({
  userId,
  email,
  status,
  isAdminAccount,
  isSelf,
  compact = false,
}: {
  userId: string;
  email: string;
  status: "active" | "disabled";
  isAdminAccount: boolean;
  isSelf: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const locked = isAdminAccount || isSelf;
  const lockReason = isSelf
    ? "This is your own account."
    : "Admin accounts are protected.";

  function close() {
    setDialog(null);
    setError(null);
    setReason("");
    setConfirmText("");
  }

  async function run(action: Dialog) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body:
          action === "delete"
            ? undefined
            : JSON.stringify({ action, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "That didn't work.");
      }

      if (action === "delete") {
        router.push("/admin/users");
      }
      router.refresh();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const size = compact ? "h-8 px-3 text-xs" : "h-10 px-4";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "active" ? (
          <button
            onClick={() => setDialog("disable")}
            disabled={locked}
            title={locked ? lockReason : undefined}
            className={cn(
              btn,
              size,
              "border-line text-ink-soft hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
            )}
          >
            <Ban className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Disable
          </button>
        ) : (
          <button
            onClick={() => setDialog("enable")}
            disabled={locked}
            title={locked ? lockReason : undefined}
            className={cn(
              btn,
              size,
              "border-line text-ink-soft hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            )}
          >
            <CheckCircle2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Re-enable
          </button>
        )}

        <button
          onClick={() => setDialog("delete")}
          disabled={locked}
          title={locked ? lockReason : undefined}
          className={cn(
            btn,
            size,
            "border-line text-ink-soft hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          )}
        >
          <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Delete
        </button>
      </div>

      {locked && !compact && (
        <p className="mt-2 text-xs text-faint">{lockReason}</p>
      )}

      {dialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) close();
          }}
        >
          <div className="w-full max-w-md rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-float)]">
            {dialog === "delete" ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold">Delete account</h2>
                    <p className="mt-1 text-sm text-muted">
                      This permanently deletes{" "}
                      <span className="font-medium text-ink">{email}</span>{" "}
                      along with their trips, favorites and saved places. It
                      cannot be undone.
                    </p>
                  </div>
                </div>
                <label className="mt-5 block text-sm font-medium">
                  Type <span className="font-mono text-rose-600">DELETE</span>{" "}
                  to confirm
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoFocus
                    className="mt-1.5 h-11 w-full rounded-xl border border-line px-3.5 text-sm focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5"
                  />
                </label>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold">
                  {dialog === "disable" ? "Disable account" : "Re-enable account"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {dialog === "disable" ? (
                    <>
                      <span className="font-medium text-ink">{email}</span> will
                      be signed out and blocked from signing back in. Their data
                      is kept and restored if you re-enable them.
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-ink">{email}</span> will
                      be able to sign in again immediately.
                    </>
                  )}
                </p>
                {dialog === "disable" && (
                  <label className="mt-5 block text-sm font-medium">
                    Reason <span className="font-normal text-faint">(optional)</span>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Recorded in the audit log"
                      autoFocus
                      className="mt-1.5 h-11 w-full rounded-xl border border-line px-3.5 text-sm placeholder:text-faint focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5"
                    />
                  </label>
                )}
              </>
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={close}
                disabled={busy}
                className={cn(btn, "h-10 px-4 border-line hover:bg-line-soft")}
              >
                Cancel
              </button>
              <button
                onClick={() => run(dialog)}
                disabled={busy || (dialog === "delete" && confirmText !== "DELETE")}
                className={cn(
                  btn,
                  "h-10 px-4 border-transparent text-white",
                  dialog === "delete"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-ink hover:bg-ink-soft"
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {dialog === "delete"
                  ? "Delete permanently"
                  : dialog === "disable"
                    ? "Disable account"
                    : "Re-enable account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
