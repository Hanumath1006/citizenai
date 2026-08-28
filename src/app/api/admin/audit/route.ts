import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";

/**
 * Records that an admin opened a user's detail page.
 *
 * This is driven from the client rather than from the page's render because
 * Next prefetches dynamic routes on link hover — logging server-side would
 * fill the audit trail with views that never happened. A log nobody can
 * trust is worse than no log.
 *
 * Only `view_user` is accepted here. Every state-changing action is logged
 * by the handler that performs it, so this endpoint cannot be used to forge
 * entries for actions that were never taken.
 */
export async function POST(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let action: string;
  let targetId: string;
  let details: string | undefined;
  try {
    ({ action, targetId, details } = (await request.json()) as {
      action: string;
      targetId: string;
      details?: string;
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (action !== "view_user" || !targetId) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  // Collapse repeat views: a refresh or a tab switch shouldn't each earn
  // their own row.
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recent } = await createServiceClient()
    .from("admin_audit_log")
    .select("id")
    .eq("admin_id", admin.userId)
    .eq("action", "view_user")
    .eq("target_id", targetId)
    .gte("created_at", since)
    .limit(1);

  if (recent?.length) return NextResponse.json({ ok: true, deduped: true });

  await logAdminAction({
    admin,
    action: "view_user",
    targetType: "user",
    targetId,
    details: details?.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}
