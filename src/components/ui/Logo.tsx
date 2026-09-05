import Link from "next/link";
import { cn } from "@/lib/utils";

/** The CitizenAI compass mark + wordmark. */
export function Logo({
  href = "/",
  showTagline = false,
  onDark = false,
  className,
}: {
  href?: string;
  showTagline?: boolean;
  /** Reverse the mark out of a coloured surface, e.g. the sandy sidebar. */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl",
          onDark ? "bg-white text-accent" : "bg-ink text-white"
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-[0.95rem] font-semibold tracking-tight",
            onDark ? "text-white" : "text-ink"
          )}
        >
          CitizenAI
        </span>
        {showTagline && (
          <span
            className={cn(
              "block text-[0.7rem]",
              onDark ? "text-white/80" : "text-faint"
            )}
          >
            Your AI city companion
          </span>
        )}
      </span>
    </Link>
  );
}
