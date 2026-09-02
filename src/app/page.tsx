import { getUser } from "@/lib/auth";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import {
  CloudSun,
  ImageIcon,
  Sparkles,
  Wand2,
  Clock,
  Wallet,
  MapPin,
  Compass,
} from "lucide-react";

const features = [
  {
    icon: Compass,
    title: "One optimized plan",
    body: "Tell us where, when, your budget and vibe. CitizenAI sequences the whole day — stops, timing and travel between them.",
  },
  {
    icon: Wand2,
    title: "Refine in one tap",
    body: "Too packed? Too pricey? Tap “More relaxed” or “More budget-friendly” and the plan rebuilds instantly.",
  },
  {
    icon: CloudSun,
    title: "Weather-aware",
    body: "We check the forecast for your date and steer you indoors when the day calls for it.",
  },
  {
    icon: ImageIcon,
    title: "Real venues & photos",
    body: "Every stop is a real place with photos, ratings and hours — pulled live, never made up.",
  },
  {
    icon: Wallet,
    title: "Budget that holds",
    body: "Pick a spending level and watch a running cost estimate stay inside it.",
  },
  {
    icon: MapPin,
    title: "Built for who you're with",
    body: "Solo, couple, family or friends — pacing and picks adapt to your group.",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell us the basics",
    body: "City, date, time window, budget, who you're with, and what you're into.",
  },
  {
    n: "02",
    title: "Get a smart itinerary",
    body: "A fully sequenced day of real venues with timing and cost — in seconds.",
  },
  {
    n: "03",
    title: "Tweak and go",
    body: "Nudge the plan with one tap until it's perfect, then save and explore.",
  },
];

export default async function Home() {
  const user = await getUser();
  const authed = !!user;

  return (
    <div className="min-h-screen">
      <SiteHeader authed={authed} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-20 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-muted">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Your AI city companion
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Spend less time
              <br /> planning.
              <br />
              <span className="text-faint">More time exploring.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              CitizenAI builds a smart, optimized local itinerary from your
              interests, budget, time and travel style in seconds. No more
              juggling Google Maps, Reddit, TikTok, Yelp, and weather apps just to plan one afternoon.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Button href={authed ? "/plan" : "/login?next=/plan"} size="lg">
                <Sparkles className="h-4 w-4" />
                Plan my outing
              </Button>
              <a
                href="#how"
                className="text-sm font-medium text-ink-soft hover:text-ink"
              >
                See how it works →
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-faint">
              <span className="inline-flex items-center gap-2">
                <CloudSun className="h-4 w-4" /> Weather-aware
              </span>
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Real venue photos
              </span>
              <span className="inline-flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Refine in one tap
              </span>
            </div>
          </div>

          {/* Hero image card */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative overflow-hidden rounded-[1.75rem] shadow-[var(--shadow-float)]">
              <img
                src="https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1200&q=80"
                alt="Golden hour in the city"
                className="h-[460px] w-full object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 p-5 backdrop-blur">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-faint">
                  2:00 PM · Coffee
                </p>
                <p className="mt-1 text-lg font-semibold">A perfect first stop</p>
                <div className="mt-3 flex gap-2">
                  <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-line-soft px-3 py-1 text-xs font-medium text-ink-soft">
                    <Clock className="h-3 w-3" /> 45 min
                  </span>
                  <span className="rounded-[var(--radius-pill)] bg-line-soft px-3 py-1 text-xs font-medium text-ink-soft">
                    $8
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line bg-canvas-warm">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">
            Three steps to your day
          </h2>
          <p className="mt-2 text-muted">
            The whole point is to remove the cognitive load. You decide the
            vibe, we handle the logistics.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-[var(--radius-card)] bg-surface border border-line p-7">
                <span className="text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight">
          Everything you need for a better day
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-7 transition hover:shadow-[var(--shadow-card)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to plan your next outing?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Sign in with Google and get your first optimized itinerary in
            seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              href={authed ? "/plan" : "/login?next=/plan"}
              size="lg"
              variant="secondary"
            >
              <Sparkles className="h-4 w-4" />
              Plan my outing
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-faint sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} CitizenAI. Explore more, plan less.</p>
        </div>
      </footer>
    </div>
  );
}
