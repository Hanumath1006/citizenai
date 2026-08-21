import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Target for links in Supabase auth emails (email verification and password
 * recovery). The templates send a one-time `token_hash` which we exchange for
 * a session server-side — the SSR-safe alternative to the implicit flow.
 *
 * Expected: /auth/confirm?token_hash=...&type=signup|recovery[&next=/path]
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Password resets must land on the "set a new password" screen; everything
  // else (email verification) can go straight into the app.
  const destination = next ?? (type === "recovery" ? "/reset-password" : "/dashboard");

  if (!token_hash || !type) {
    console.error("[auth/confirm] missing token_hash or type:", request.url);
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error(`[auth/confirm] verifyOtp failed (${type}):`, error.message);
    // Expired or already-used links are the common case — send the user
    // somewhere they can request a fresh one.
    const fallback =
      type === "recovery" ? "/forgot-password?error=expired" : "/login?error=verify";
    return NextResponse.redirect(`${origin}${fallback}`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
