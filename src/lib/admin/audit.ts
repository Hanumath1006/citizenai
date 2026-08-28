import { createServiceClient } from "@/lib/supabase/server";
import { callerIp, type AdminContext } from "@/lib/admin/auth";

/**
 * Append-only record of privileged admin actions. Disabling and deleting
 * accounts are irreversible from the user's point of view, so every one of
 * them leaves a trail: who, what, when, and from where.
 *
 * Logging never blocks the action it describes — a failure here is reported
 * to the server console, not to the admin mid-operation.
 */
export type AdminAction =
  | "view_user"
  | "disable_user"
  | "enable_user"
  | "delete_user"
  | "export_report";

export async function logAdminAction(args: {
  admin: AdminContext;
  action: AdminAction;
  targetType?: string;
  targetId?: string;
  details?: string;
}) {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_audit_log").insert({
      admin_id: args.admin.userId,
      admin_email: args.admin.email,
      action: args.action,
      target_type: args.targetType ?? null,
      target_id: args.targetId ?? null,
      details: args.details?.slice(0, 500) ?? null,
      ip: await callerIp(),
    });
  } catch (err) {
    console.error("[audit] failed to record admin action:", err);
  }
}

/** Human-readable label for an action code. */
export const ACTION_LABELS: Record<string, string> = {
  view_user: "Viewed user",
  disable_user: "Disabled user",
  enable_user: "Re-enabled user",
  delete_user: "Deleted user",
  export_report: "Exported report",
};
