"use client";

import { useEffect, useRef } from "react";

/**
 * Fires one audit ping when an admin actually opens a user's detail page.
 * Renders nothing. The server de-duplicates repeat views, so a refresh
 * doesn't create a second entry.
 */
export function RecordView({
  targetId,
  details,
}: {
  targetId: string;
  details?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    // Guards against React's double-invoked effects in development.
    if (sent.current) return;
    sent.current = true;

    fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "view_user", targetId, details }),
      keepalive: true,
    }).catch(() => {
      // Audit pings are best-effort; never surface this to the admin.
    });
  }, [targetId, details]);

  return null;
}
