"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Receipt,
  ScrollText,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* The admin area deliberately inverts the app's chrome — dark rail, light
   canvas — so it is never mistaken for the traveller-facing product. */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: { heading?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Overview", icon: LayoutGrid }] },
  {
    heading: "Management",
    items: [{ href: "/admin/users", label: "Users", icon: Users }],
  },
  {
    heading: "Analytics",
    items: [
      { href: "/admin/usage", label: "Usage & Costs", icon: Receipt },
      { href: "/admin/activity", label: "Activity Log", icon: ScrollText },
    ],
  },
];

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items);

function isActive(pathname: string, href: string) {
  // "/admin" is the index, so it must match exactly or every child would
  // light it up alongside the real destination.
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function AdminMark() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-semibold tracking-tight text-white">
          CitizenAI
        </span>
        <span className="block text-[0.7rem] text-white/50">Admin console</span>
      </span>
    </Link>
  );
}

export function AdminSidebar({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink px-4 py-6">
      <div className="px-2">
        <AdminMark />
      </div>

      <nav className="mt-8 flex flex-col gap-6">
        {SECTIONS.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && (
              <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-white/35">
                {section.heading}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(pathname, item.href)
                      ? "bg-brand text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Back to app
        </Link>

        <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-white/5 p-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
              {(name || email || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-[0.7rem] text-white/45">
              Administrator
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-ink">
      <div className="flex h-14 items-center justify-between px-4">
        <AdminMark />
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-white hover:bg-white/10"
          aria-label="Admin menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-3 py-3">
          {ALL_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                isActive(pathname, item.href)
                  ? "bg-brand text-white"
                  : "text-white/60"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </nav>
      )}
    </div>
  );
}
