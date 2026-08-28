-- ═══════════════════════════════════════════════════════════════
--  CitizenAI · restore trigger function privileges
--  Fixes a regression introduced by 0003_harden_functions.sql.
--
--  0003 revoked EXECUTE on the two trigger functions from PUBLIC to
--  satisfy a database-linter warning. That was wrong on two counts:
--
--   1. PostgreSQL checks EXECUTE on a trigger function against the role
--      performing the DML. `supabase_auth_admin` (which inserts into
--      auth.users on signup) and `authenticated` (which updates profiles
--      and trips) were both inheriting that privilege through PUBLIC, so
--      revoking from PUBLIC broke signup and profile/trip updates.
--
--   2. The warning did not apply in the first place. PostgREST does not
--      expose functions returning `trigger` as RPC endpoints, so neither
--      function was ever reachable at /rest/v1/rpc/ regardless of grants.
--
--  The genuinely useful parts of 0003 — dropping the unused is_admin()
--  helper and pinning the search_path — are left in place.
-- ═══════════════════════════════════════════════════════════════

-- ── touch_updated_at: BEFORE UPDATE trigger on profiles and trips ──
-- Invoked by whichever role performs the UPDATE, which is `authenticated`
-- for ordinary users. Restore the default PUBLIC grant.
grant execute on function public.touch_updated_at() to public;

-- ── handle_new_user: AFTER INSERT trigger on auth.users ────────────
-- Only ever fired by Supabase Auth. Grant it precisely to the role that
-- needs it rather than to PUBLIC, so the intent stays legible and the
-- function stays off the API surface for browser roles.
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.handle_new_user() to postgres;
