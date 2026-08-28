-- ═══════════════════════════════════════════════════════════════
--  CitizenAI · function hardening
--  Run after 0002_admin_and_usage.sql.
--
--  Closes three findings from the Supabase database linter. None were
--  exploitable in practice, but all three are free to fix.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Drop the unused is_admin() helper ───────────────────────
-- 0002 added this to let an RLS policy check admin status without
-- recursing into its own policy. That approach was replaced by
-- column-level GRANTs on profiles, leaving the function unused.
--
-- PostgREST exposes every public function as an RPC endpoint, so while it
-- existed, an anonymous caller could POST /rest/v1/rpc/is_admin with any
-- user id and learn whether that account is an administrator. Nothing
-- calls it, so it simply goes away.
drop function if exists public.is_admin(uuid);

-- ── 2. Trigger functions are not RPC endpoints ─────────────────
-- handle_new_user() runs SECURITY DEFINER on the auth.users insert
-- trigger. Postgres refuses to execute a trigger function called directly,
-- so this was not exploitable — but a SECURITY DEFINER function should
-- never be reachable from the public API at all.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;

-- ── 3. Pin the search_path on touch_updated_at ─────────────────
-- Without an explicit search_path, a caller controlling the setting could
-- influence which objects the function body resolves to. Every other
-- function in this schema already pins it; this one was missed in 0001.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The re-created function needs its grants revoked again.
revoke execute on function public.touch_updated_at() from anon, authenticated, public;
