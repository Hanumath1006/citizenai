"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { getSiteUrl } from "@/lib/utils";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the account exists but the email was never confirmed.
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnverified(false);
    setResent(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setBusy(false);
      // Supabase reports unconfirmed accounts distinctly — surface a way out
      // instead of a dead-end "invalid credentials".
      if (/not confirmed|not verified/i.test(error.message)) {
        setUnverified(true);
        setError("Please verify your email before signing in.");
      } else if (/invalid login credentials/i.test(error.message)) {
        setError("That email or password doesn't match an account.");
      } else {
        setError(error.message);
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function resendVerification() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
    });
    setBusy(false);
    setResent(true);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          disabled={busy}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          {unverified && !resent && (
            <button
              type="button"
              onClick={resendVerification}
              disabled={busy}
              className="mt-1 block font-medium underline hover:no-underline"
            >
              Resend verification email
            </button>
          )}
        </div>
      )}

      {resent && (
        <p className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <MailCheck className="h-4 w-4" />
          Verification email sent — check your inbox.
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
