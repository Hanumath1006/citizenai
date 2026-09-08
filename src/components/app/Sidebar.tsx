"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPinned,
  Heart,
  Bookmark,
  User,
  Settings,
  Sparkles,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Collapsing sidebar.

   Rests as a slim icon rail and opens to full width on hover, so the page
   gets the horizontal space back without losing one-click navigation.

   Three details make it behave rather than merely animate:

   · The rail is fixed and the expansion OVERLAYS the page. Widening an
     in-flow sidebar would reflow the content under the cursor every time
     it crossed the edge, which is exactly the sort of jumpiness that makes
     hover UI feel broken.

   · Hover alone would strand keyboard and touch users, so it also opens on
     focus, and the ☰ button pins it open. The pin persists, because a
     preference that resets on every navigation is not a preference.

   · Labels stay in the DOM when collapsed and are hidden with opacity, not
     `display:none`. Screen readers still announce them, so the collapsed
     rail is not a wall of unlabelled icons.
   ────────────────────────────────────────────────────────────── */

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "My Trips", icon: MapPinned },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/saved", label: "Saved Places", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  isAdmin = false,
  pinned,
  onTogglePin,
}: {
  isAdmin?: boolean;
  /** Owned by AppShell, which also widens the page gutter when pinned. */
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const open = pinned || hovered || focused;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        // Only collapse once focus has left the sidebar entirely, rather
        // than on every tab between its own links.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden",
        "bg-accent px-3 py-6 shadow-[var(--shadow-float)] lg:flex",
        "transition-[width] duration-200 ease-out",
        open ? "w-64" : "w-[4.5rem]"
      )}
      aria-label="Main navigation"
    >
      {/* Toggle + wordmark */}
      <div className="flex items-center gap-2.5 px-1.5">
        <button
          onClick={onTogglePin}
          aria-expanded={open}
          aria-label={pinned ? "Unpin the sidebar" : "Keep the sidebar open"}
          title={pinned ? "Unpin the sidebar" : "Keep the sidebar open"}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition-colors",
            pinned ? "bg-ink/85" : "hover:bg-white/20"
          )}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/dashboard"
          className={cn(
            "min-w-0 leading-tight transition-opacity duration-200",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <span className="block truncate text-[0.95rem] font-semibold tracking-tight text-white">
            CitizenAI
          </span>
          <span className="block truncate text-[0.7rem] text-white/80">
            Your AI city companion
          </span>
        </Link>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition-colors",
                active
                  ? "bg-ink/85 shadow-[0_2px_10px_rgba(44,33,21,0.25)]"
                  : "hover:bg-white/15"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span
                className={cn(
                  "truncate transition-opacity duration-200",
                  open ? "opacity-100" : "opacity-0"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Rendered only for admins — the server decides, not the client. */}
        {isAdmin && (
          <Link
            href="/admin"
            title="Admin"
            className="mt-2 flex items-center gap-3 rounded-xl border border-white/35 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/60 hover:bg-white/15"
          >
            <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
            <span
              className={cn(
                "truncate transition-opacity duration-200",
                open ? "opacity-100" : "opacity-0"
              )}
            >
              Admin
            </span>
          </Link>
        )}
      </nav>

      {/* Plan CTA — a full card when open, a single button when collapsed. */}
      <div className="mt-auto">
        {open ? (
          <div className="rounded-[var(--radius-card)] bg-ink/85 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="truncate">Plan smarter with AI</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/80">
              Personalized recommendations and real-time updates.
            </p>
            <Link
              href="/plan"
              className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-canvas text-sm font-medium text-ink transition hover:bg-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Plan a new outing
            </Link>
          </div>
        ) : (
          <Link
            href="/plan"
            title="Plan a new outing"
            aria-label="Plan a new outing"
            className="grid h-11 w-11 place-items-center rounded-[var(--radius-card)] bg-ink/85 text-white transition hover:bg-ink"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </Link>
        )}
      </div>
    </aside>
  );
}
