"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileTopBar } from "@/components/app/MobileTopBar";
import { cn } from "@/lib/utils";

/**
 * Desktop shell that owns the sidebar's pinned state.
 *
 * Pinning has to live here rather than inside the sidebar because it
 * changes the page's gutter. The two expansion modes are deliberately
 * different:
 *
 *   hover — transient, so the panel OVERLAYS the page and nothing reflows
 *           under the cursor.
 *   pinned — a standing choice, so the gutter widens and the content moves
 *           over. Overlaying permanently would hide the left edge of every
 *           page for as long as the pin was set.
 */

const PIN_KEY = "citizenai:sidebar:pinned";

export function AppShell({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);

  // Restored after mount; localStorage doesn't exist during the server
  // render, and reading it while rendering would desync hydration.
  useEffect(() => {
    try {
      setPinned(localStorage.getItem(PIN_KEY) === "1");
    } catch {
      // Blocked storage — collapsed is a fine default.
    }
  }, []);

  function togglePin() {
    setPinned((was) => {
      const next = !was;
      try {
        localStorage.setItem(PIN_KEY, next ? "1" : "0");
      } catch {
        // Preference just won't outlive this session.
      }
      return next;
    });
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-canvas transition-[padding] duration-200 ease-out",
        pinned ? "lg:pl-64" : "lg:pl-[4.5rem]"
      )}
    >
      <Sidebar isAdmin={isAdmin} pinned={pinned} onTogglePin={togglePin} />
      <div className="flex min-h-screen min-w-0 flex-col">
        <MobileTopBar isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
