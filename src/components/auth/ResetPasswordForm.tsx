"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import {
  PasswordInput,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/components/auth/PasswordInput";

/**
 * Sets a new password. Relies on the recovery session created by
 * /auth/confirm when the user clicked the emailed link.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weak = validatePassword(password);
    if (weak) return setError(weak);
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    setDone(true);
    // The recovery session is already a full session — send them straight in.
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <div className="mt-8 flex items-start gap-3 rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700">
        <Check className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Password updated</p>
          <p className="mt-1 text-green-700/80">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          disabled={busy}
        />
        <p className="text-xs text-faint">
          At least {MIN_PASSWORD_LENGTH} characters, with a letter and a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput
          id="confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          disabled={busy}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Updating…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
