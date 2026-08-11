"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan an outing" },
  { href: "/trips", label: "My Trips" },
  { href: "/favorites", label: "Favorites" },
  { href: "/saved", label: "Saved Places" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden sticky top-0 z-40 border-b border-line bg-surface">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-line-soft"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-line px-3 py-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                pathname.startsWith(item.href)
                  ? "bg-brand-soft text-brand"
                  : "text-muted"
              )}
            >
              {item.label === "Plan an outing" && (
                <Sparkles className="h-4 w-4" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
