import Link from "next/link";
import {
  Briefcase,
  MapPin,
  Star,
  Heart,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getProfile, displayName, getUser } from "@/lib/auth";
import { getTrips } from "@/lib/trips";
import { countBookmarks } from "@/lib/bookmarks";
import { getForecast } from "@/lib/weather";
import { TripCard } from "@/components/trips/TripCard";
import { WeatherBadge } from "@/components/itinerary/WeatherBadge";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Dashboard — CitizenAI" };

const RECS = [
  "Hidden coffee gems worth the detour",
  "Rooftops with the best skyline views",
  "Local restaurants you'll love",
];

export default async function DashboardPage() {
  const [profile, user, trips, favCount] = await Promise.all([
    getProfile(),
    getUser(),
    getTrips(),
    countBookmarks("favorites"),
  ]);

  const name = displayName(profile, user?.email);
  const upcoming = trips.filter((t) => t.status === "upcoming");
  const cities = new Set(trips.map((t) => t.city)).size;
  const placesVisited = trips
    .filter((t) => t.status === "completed")
    .reduce((n, t) => n + t.stopCount, 0);

  const weatherCity = profile?.home_city || upcoming[0]?.city || null;
  const weather = weatherCity
    ? await getForecast(weatherCity, new Date().toISOString().slice(0, 10))
    : null;

  const stats = [
    { icon: Briefcase, label: "Trips planned", value: trips.length, tone: "brand" },
    { icon: MapPin, label: "Cities explored", value: cities, tone: "accent" },
    { icon: Star, label: "Places visited", value: placesVisited, tone: "brand" },
    { icon: Heart, label: "Favorites", value: favCount, tone: "accent" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Good day, {name} 👋
          </h1>
          <p className="mt-1 text-muted">
            Ready to explore somewhere amazing today?
          </p>
        </div>
        <Button href="/plan">
          <Sparkles className="h-4 w-4" /> Plan a new outing
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-4">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    s.tone === "brand"
                      ? "bg-brand-soft text-brand"
                      : "bg-accent-soft text-accent"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-faint">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Upcoming */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming trips</h2>
              <Link
                href="/trips"
                className="text-sm text-brand hover:underline"
              >
                View all
              </Link>
            </div>
            {upcoming.length ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {upcoming.slice(0, 2).map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            ) : (
              <Card className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium">No upcoming outings yet</p>
                  <p className="text-sm text-muted">
                    Plan one and it&apos;ll appear here.
                  </p>
                </div>
                <Button href="/plan" variant="secondary" size="sm">
                  Plan <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            )}
          </section>

          {/* Recent */}
          {trips.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent trips</h2>
                <Link
                  href="/trips"
                  className="text-sm text-brand hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {trips.slice(0, 3).map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* Plan CTA */}
          <Card className="bg-ink p-6 text-white">
            <p className="font-semibold">Let&apos;s plan something new</p>
            <p className="mt-1 text-sm text-white/70">
              Tell me where, when, and what you love. I&apos;ll handle the rest.
            </p>
            <Button
              href="/plan"
              variant="secondary"
              size="sm"
              className="mt-4"
            >
              Plan a new outing
            </Button>
          </Card>

          {/* Weather */}
          {weather?.isAvailable && weatherCity && (
            <Card className="p-6">
              <p className="text-sm font-semibold">Weather in {weatherCity}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-4xl font-semibold">
                  {weather.tempF}°
                </span>
                <WeatherBadge weather={weather} />
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="p-6">
            <p className="text-sm font-semibold">Recommended for you</p>
            <p className="text-xs text-faint">Based on your interests</p>
            <div className="mt-4 space-y-1">
              {RECS.map((r) => (
                <Link
                  key={r}
                  href="/plan"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-line-soft"
                >
                  <span className="text-ink-soft">{r}</span>
                  <ChevronRight className="h-4 w-4 text-faint" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
