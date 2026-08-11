import Link from "next/link";
import { cn } from "@/lib/utils";

/** The CitizenAI compass mark + wordmark. */
export function Logo({
  href = "/",
  showTagline = false,
  className,
}: {
  href?: string;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[0.95rem] font-semibold tracking-tight text-ink">
          CitizenAI
        </span>
        {showTagline && (
          <span className="block text-[0.7rem] text-faint">
            Your AI city companion
          </span>
        )}
      </span>
    </Link>
  );
}
