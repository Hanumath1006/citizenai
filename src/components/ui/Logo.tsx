import Link from "next/link";
import { cn } from "@/lib/utils";

/** The CitizenAI compass mark + wordmark. */
export function Logo({
  href = "/",
  showTagline = false,
  onDark = false,
  hideWordmark = false,
  className,
}: {
  href?: string;
  showTagline?: boolean;
  /** Reverse the mark out of a dark surface, e.g. the sidebar rail. */
  onDark?: boolean;
  /**
   * Fade out the text and let the mark stand alone, for the collapsed
   * sidebar rail. The words stay in the DOM so screen readers still get the
   * name, and so widening the rail animates rather than popping.
   */
  hideWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex min-w-0 items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          onDark ? "bg-brand text-white" : "bg-ink text-white"
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
      <span
        className={cn(
          "min-w-0 leading-tight transition-opacity duration-200",
          hideWordmark && "pointer-events-none opacity-0"
        )}
      >
        <span
          className={cn(
            "block truncate text-[0.95rem] font-semibold tracking-tight",
            onDark ? "text-white" : "text-ink"
          )}
        >
          CitizenAI
        </span>
        {showTagline && (
          <span
            className={cn(
              "block truncate text-[0.7rem]",
              onDark ? "text-white/50" : "text-faint"
            )}
          >
            Your AI city companion
          </span>
        )}
      </span>
    </Link>
  );
}
