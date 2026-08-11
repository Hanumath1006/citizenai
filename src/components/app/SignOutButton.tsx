import { LogOut } from "lucide-react";

/** Posts to the sign-out route; server clears the Supabase session. */
export function SignOutButton({
  className,
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className={
          className ??
          "inline-flex items-center gap-2 text-sm text-muted hover:text-red-600"
        }
      >
        <LogOut className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}
