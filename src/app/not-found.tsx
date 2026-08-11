import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">This page wandered off</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          We couldn&apos;t find what you were looking for. Let&apos;s get you
          back on the map.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/" variant="secondary">
            Home
          </Button>
          <Button href="/dashboard">Dashboard</Button>
        </div>
      </div>
    </div>
  );
}
