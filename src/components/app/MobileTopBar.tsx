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

export function MobileTopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    // Mirrors the desktop sidebar: sandy brown with white reversed out.
    <div className="lg:hidden sticky top-0 z-40 bg-accent text-white">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo onDark />
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg text-white hover:bg-white/15"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/20 px-3 py-3">
          {[...nav, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white",
                pathname.startsWith(item.href) ? "bg-ink/85" : "hover:bg-white/15"
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
