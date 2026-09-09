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
import { Logo } from "@/components/ui/Logo";
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
      onFocusCapture={(e) => {
        // Only KEYBOARD focus holds the rail open. Clicking a button also
        // focuses it, and counting that made unpinning impossible: the
        // click cleared `pinned`, `focused` instantly took its place, and
        // because the button kept focus after the pointer left, the rail
        // never collapsed. :focus-visible is exactly this distinction.
        const el = e.target as HTMLElement;
        try {
          if (el.matches(":focus-visible")) setFocused(true);
        } catch {
          // Ancient browser without :focus-visible — fall back to hover
          // only, which still leaves the rail usable.
        }
      }}
      onBlurCapture={(e) => {
        // Only collapse once focus has left the sidebar entirely, rather
        // than on every tab between its own links.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden",
        "bg-ink px-3 py-6 shadow-[var(--shadow-float)] lg:flex",
        "transition-[width] duration-200 ease-out",
        open ? "w-64" : "w-[4.5rem]"
      )}
      aria-label="Main navigation"
    >
      {/* Brand on the left, pin toggle on the right. Collapsed, the rail is
          only wide enough for one of them, and the mark is the one worth
          keeping — the whole rail is the hover target, so the toggle can
          wait until there is room for it. */}
      <div className="flex items-center gap-2.5 px-1.5">
        <Logo href="/dashboard" onDark showTagline hideWordmark={!open} />

        <button
          onClick={onTogglePin}
          aria-expanded={open}
          aria-label={pinned ? "Unpin the sidebar" : "Keep the sidebar open"}
          title={pinned ? "Unpin the sidebar" : "Keep the sidebar open"}
          className={cn(
            "ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition-all duration-200",
            pinned ? "bg-brand" : "hover:bg-white/10",
            open ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <Menu className="h-5 w-5" />
        </button>
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
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
            className="mt-2 flex items-center gap-3 rounded-xl border border-white/20 px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white"
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
          <div className="rounded-[var(--radius-card)] bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate">Plan smarter with AI</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              Personalized recommendations and real-time updates.
            </p>
            <Link
              href="/plan"
              className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-white text-sm font-medium text-ink transition hover:bg-white/90"
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
            className="grid h-11 w-11 place-items-center rounded-[var(--radius-card)] bg-brand text-white transition hover:opacity-90"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </Link>
        )}
      </div>
    </aside>
  );
}
