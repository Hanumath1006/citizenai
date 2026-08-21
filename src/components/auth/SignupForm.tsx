"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Label, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import {
  PasswordInput,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/components/auth/PasswordInput";
import { getSiteUrl } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const weak = validatePassword(password);
    if (weak) return setError(weak);
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Picked up by the handle_new_user() trigger to seed profiles.full_name.
        data: { full_name: name.trim() || null },
        emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      },
    });

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    // With email confirmation on, no session is returned — the user must click
    // the link first. (Supabase intentionally returns success for an existing
    // email too, so we don't leak which addresses are registered.)
    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          disabled={busy}
        />
      </div>

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
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="confirm">Confirm password</Label>
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
            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
