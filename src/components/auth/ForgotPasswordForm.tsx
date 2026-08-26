"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { getSiteUrl } from "@/lib/utils";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });

    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Always report success so we don't reveal which emails have accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-green-700/80">
              If an account exists for {email}, we&apos;ve sent a link to reset
              your password. The link expires in 1 hour.
            </p>
          </div>
        </div>
        <Link href="/login" className="block text-sm text-brand hover:underline">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
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
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>

      <Link
        href="/login"
        className="block pt-2 text-center text-sm text-muted hover:text-ink"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}
