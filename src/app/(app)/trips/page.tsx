import { MapPinned } from "lucide-react";
import { getTrips } from "@/lib/trips";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "My Trips — CitizenAI" };

export default async function TripsPage() {
  const trips = await getTrips();
  const upcoming = trips.filter((t) => t.status === "upcoming");
  const completed = trips.filter((t) => t.status === "completed");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Trips</h1>
          <p className="mt-1 text-muted">
            {trips.length
              ? `${trips.length} outing${trips.length === 1 ? "" : "s"} planned`
              : "Your planned outings live here"}
          </p>
        </div>
        <Button href="/plan">Plan a new outing</Button>
      </div>

      {trips.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={MapPinned}
            title="No trips yet"
            body="Generate your first optimized itinerary and it'll show up here to revisit anytime."
            actionLabel="Plan my first outing"
            actionHref="/plan"
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-faint">
                Upcoming
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-faint">
                Completed
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
