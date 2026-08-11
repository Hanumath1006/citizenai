# CitizenAI

> Your AI city companion — spend less time planning, more time exploring.

CitizenAI turns a few inputs (city, date, time window, budget, who you're with, how you get around, and what you love) into a fully sequenced, weather-aware, one-day itinerary of **real venues** — in seconds. Then refine it with one tap.

## How it works

The core design principle: **AI plans the shape, real APIs supply the facts.**

1. **Gemini** (`gemini-3.6-flash`) designs an optimized, ordered plan from your inputs.
2. **Google Places** resolves each stop to a real venue with photos, ratings and address.
3. **Google Routes** fills in realistic travel times between stops.
4. **OpenWeather** adds the forecast and steers you indoors on bad-weather days.

Every external step degrades gracefully — if a key isn't configured, the app falls back to the model's own estimates so you can still see it working.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Google OAuth auth + Postgres (row-level security)
- **Google Gemini API** — itinerary generation (structured JSON output)
- **Google Maps Platform** — Places (New) + Routes
- **OpenWeather** — forecast

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the template and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (keep server-only) |
| `GEMINI_API_KEY` | https://aistudio.google.com → Get API key |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console — enable **Places API (New)** and **Routes API** |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev |

### 3. Set up the database

In the Supabase SQL editor, run the migration:

```
supabase/migrations/0001_init.sql
```

This creates the `profiles`, `trips`, `stops`, `favorites`, and `saved_places`
tables with row-level security, plus a trigger that auto-creates a profile row
on sign-up.

### 4. Enable Google sign-in

In Supabase → Authentication → Providers → **Google**, add your Google OAuth
client ID and secret. Set the authorized redirect URL to:

```
https://<your-project>.supabase.co/auth/v1/callback
```

And in the Google Cloud OAuth consent screen, add `http://localhost:3000` as an
authorized origin. The app's own callback route is `/auth/callback`.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Google sign-in |
| `/dashboard` | Stats, upcoming/recent trips, weather, recommendations |
| `/plan` | The planner input form |
| `/plan/result` | Generated itinerary + one-tap refinement |
| `/trips` · `/trips/[id]` | Saved trips list and detail |
| `/favorites` · `/saved` | Bookmarked venues |
| `/profile` · `/settings` | Defaults and account |

## Deploying (Vercel + custom domain)

Host the app free on Vercel and point any domain (bought anywhere — Hostinger,
GoDaddy, Cloudflare) at it.

1. **Push to GitHub** — commit the repo (secrets stay out via `.gitignore`) and push.
2. **Import to Vercel** — New Project → import the repo. Next.js is auto-detected.
3. **Set env vars** in Vercel (Production) — the same keys as `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
   `GOOGLE_MAPS_API_KEY`, `OPENWEATHER_API_KEY`, and `NEXT_PUBLIC_SITE_URL`
   (set to the live URL).
4. **Add the domain** in Vercel → Settings → Domains, and add the DNS records it
   shows at your registrar. HTTPS is issued automatically.
5. **Update auth for the live URL** (the step everyone forgets):
   - `NEXT_PUBLIC_SITE_URL` → `https://yourdomain.com`, then redeploy.
   - Supabase → Authentication → URL Configuration: Site URL + add
     `https://yourdomain.com/**` to Redirect URLs.
   - Google Cloud → OAuth consent screen → **Publish app** (Testing → Production)
     so any Google user can sign in. Non-sensitive scopes need no review. The
     Supabase callback URI in the Google OAuth client is unchanged.
6. **Harden** — restrict the Google Maps key to Places (New) + Routes, and set a
   Google Cloud billing budget alert. Enable pay-as-you-go on Gemini before heavy
   traffic to lift free-tier rate limits.

## Roadmap

- Stripe payments (deferred to a later iteration)
- Multi-day trips
- Shareable public itineraries

## Project structure

```
src/
  app/
    (app)/            authenticated app shell (sidebar) + pages
    api/              itinerary generation, trips, bookmarks, profile, photo proxy
    auth/             OAuth callback + sign-out
    login/            sign-in page
    page.tsx          landing page
  components/         UI primitives, planner, itinerary, trips, bookmarks
  lib/
    ai/planner.ts     Gemini itinerary generation
    google/           Places + Routes
    itinerary/        generation orchestrator
    supabase/         browser/server clients + types
    weather.ts        OpenWeather forecast
supabase/migrations/  SQL schema
```
