import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared handler for every link Supabase sends users back on:
 *  - OAuth sign-in            → `?code=...`
 *  - Email verification       → `?code=...` (default templates) or
 *                               `?token_hash=...&type=signup` (custom templates)
 *  - Password recovery        → same two shapes, with type=recovery
 *
 * Supporting both shapes means the app works with Supabase's default
 * templates (which cannot be edited without custom SMTP) and keeps working
 * if the templates are later switched to the token_hash style.
 */
export async function handleAuthRedirect(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Password resets must land on the "set a new password" screen.
  const destination =
    next ?? (type === "recovery" ? "/reset-password" : "/dashboard");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error("[auth] code exchange failed:", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
    console.error(`[auth] verifyOtp failed (${type}):`, error.message);
  } else {
    console.error("[auth] no code or token_hash present:", request.url);
  }

  // Before reporting failure, check whether a session already exists.
  //
  // This route can be hit twice for a single sign-in — a browser prefetch, a
  // retried navigation, or a duplicated redirect. The auth code is one-time:
  // the first request spends it and establishes the session, and the second
  // then fails with "code/state already used". Treating that second request
  // as a failure tells the user sign-in didn't work at the exact moment it
  // did, and bounces them away from the session they just got.
  //
  // If a valid session is present, the exchange succeeded — whoever won the
  // race — so honour it and continue to the destination.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(`${origin}${destination}`);

  // Genuinely expired / already-used links — send the user somewhere they
  // can request a fresh one.
  const fallback =
    type === "recovery" ? "/forgot-password?error=expired" : "/login?error=auth";
  return NextResponse.redirect(`${origin}${fallback}`);
}
