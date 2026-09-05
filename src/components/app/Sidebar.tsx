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
  ShieldCheck,
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

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    // Sandy brown rail against the cream page. Label text is pure white
    // rather than the usual translucent white: at 4.69:1 white clears AA on
    // #8a6f52, but white/60 drops to 2.77:1 and fails outright — so opacity
    // is spent on surfaces here, never on text.
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-accent px-4 py-6">
      <div className="px-2">
        <Logo showTagline onDark />
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition-colors",
                active
                  ? "bg-ink/85 shadow-[0_2px_10px_rgba(44,33,21,0.25)]"
                  : "hover:bg-white/15"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}

        {/* Rendered only for admins — the server decides, not the client. */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-2 flex items-center gap-3 rounded-xl border border-white/35 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/60 hover:bg-white/15"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            Admin
          </Link>
        )}
      </nav>

      <div className="mt-auto rounded-[var(--radius-card)] bg-ink/85 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4" />
          Plan smarter with AI
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
    </aside>
  );
}
