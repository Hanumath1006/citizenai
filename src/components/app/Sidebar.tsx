"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPinned,
  Heart,
  Bookmark,
  User,
  Settings,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "My Trips", icon: MapPinned },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/saved", label: "Saved Places", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <div className="px-2">
        <Logo showTagline />
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-muted hover:bg-line-soft hover:text-ink"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[var(--radius-card)] bg-gradient-to-br from-brand-soft to-accent-soft p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-brand" />
          Plan smarter with AI
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Personalized recommendations and real-time updates.
        </p>
        <Link
          href="/plan"
          className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-ink text-sm font-medium text-white hover:bg-ink-soft transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Plan a new outing
        </Link>
      </div>
    </aside>
  );
}
