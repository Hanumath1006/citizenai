import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-pill)] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-ink-soft shadow-[var(--shadow-raise)]",
  secondary: "bg-surface-raised text-ink border border-line hover:border-ink/30",
  ghost: "text-ink-soft hover:text-ink hover:bg-line-soft",
  outline: "border border-line text-ink hover:bg-line-soft",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-4 h-9",
  md: "text-sm px-5 h-11",
  lg: "text-base px-7 h-14",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    className,
    children,
    href,
    ...rest
  } = props as ButtonAsButton & { href?: string };
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={classes}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
