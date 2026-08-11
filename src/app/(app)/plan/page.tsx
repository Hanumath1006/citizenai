import { getProfile } from "@/lib/auth";
import { Card } from "@/components/ui/primitives";
import { PlannerForm } from "@/components/planner/PlannerForm";
import type { Budget, Transport, TravelStyle } from "@/lib/types";

export const metadata = { title: "Plan an outing — CitizenAI" };

export default async function PlanPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          New outing
        </span>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Let&apos;s plan something
        </h1>
        <p className="mt-2 text-muted">
          Tell us where, when, and what you love — we&apos;ll handle the rest.
        </p>
      </header>

      <Card className="p-6 sm:p-8">
        <PlannerForm
          defaults={{
            city: profile?.home_city ?? "",
            budget: (profile?.default_budget as Budget) ?? undefined,
            travelStyle: (profile?.default_style as TravelStyle) ?? undefined,
            transport: (profile?.default_transport as Transport) ?? undefined,
            interests: profile?.default_interests?.length
              ? profile.default_interests
              : undefined,
          }}
        />
      </Card>
    </div>
  );
}
