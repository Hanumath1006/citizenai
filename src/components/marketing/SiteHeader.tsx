import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export function SiteHeader({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how" className="hover:text-ink transition">
            How it works
          </a>
          <a href="#features" className="hover:text-ink transition">
            Features
          </a>
        </nav>
        <Button href={authed ? "/dashboard" : "/plan"} size="sm">
          {authed ? "Open dashboard" : "Open planner"}
        </Button>
      </div>
    </header>
  );
}
