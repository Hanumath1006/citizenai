"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { getSiteUrl } from "@/lib/utils";

export function ResendVerification({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      // Usually the per-hour send limit.
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-green-700">
        <MailCheck className="h-4 w-4" /> Sent — check your inbox again.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={resend} disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
