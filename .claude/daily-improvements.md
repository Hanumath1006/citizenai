# Daily improvements backlog

The `daily-citizenai-improvement` scheduled task works through this file: each run
takes the **first unchecked item**, implements it, verifies it, and opens a branch.

## Rules

- One item per run. Small and self-contained — if an item turns out to be large,
  split it, do the first slice, and leave the rest as new unchecked items.
- Tick the item off (`[x]`) in the same commit that implements it.
- **Never invent work.** If every item is ticked, the run stops and says the backlog
  is empty. A repo does not need a commit every day more than it needs to stay
  working.
- Nothing here should touch auth, payments, RLS policies, or migrations. Those are
  changes that want a human at the keyboard.

## Queue

- [ ] **Fix the Places price tier.** `PRICE_PLACES_TEXT_SEARCH` in
      `src/lib/usage/pricing.ts` defaults to the Pro rate (0.032), but the field mask
      in `src/lib/places.ts` requests `rating` and `regularOpeningHours`, which bills
      as Enterprise. Correct the default and note the SKU in the comment.
- [ ] **`aria-live` on the planner error.** The validation error in
      `src/components/planner/PlannerForm.tsx` renders silently for screen readers.
      Wrap it in a polite live region.
- [ ] **Forecast per day in the planner peek.** `WeatherPeek` shows the first day
      only. For a multi-day range, show a compact row of one icon per day using
      `getForecastRange`, so a rainy Wednesday is visible before generating.
- [ ] **Empty states for Favorites and Saved Places.** Both lists render bare when
      empty. Add an illustration-free empty state with a line of copy and a link to
      `/plan`.
- [ ] **Loading skeletons for the dashboard.** Add `loading.tsx` for
      `src/app/(app)/dashboard` so the shell paints instantly instead of blocking on
      the trips query.
- [ ] **"Tomorrow" and "This weekend" quick-set buttons** on the planner date row.
      Two small pills that set the range, for the common cases that currently need
      the date picker.
- [ ] **Relative timestamps on trip cards.** "3 days ago" reads better than a raw
      date on `/trips`. Format at render time, and keep the exact date in a `title`.
- [ ] **Show total travel time on the trip card.** `Itinerary.totalTravelMin` is
      computed and stored but only surfaced on the detail page.
- [ ] **`README.md` deploy section.** Document the required env vars and the
      redirect-URL updates that a new deploy needs. Useful the next time this moves
      hosts.
- [ ] **Focus rings on the interest pills.** `Pill` in
      `src/components/ui/primitives.tsx` has a hover state but no visible
      `:focus-visible` ring, so keyboard users lose their place in the grid.

## Done

<!-- Ticked items get moved down here with their date and branch. -->

- [x] **Cache photos at the edge.** `src/app/api/photo/route.ts` sets a private
      `Cache-Control`. Add `s-maxage` + `stale-while-revalidate` so Vercel's CDN
      serves repeat and shared views without re-hitting Google. Cheapest single win
      on the Maps bill. — 2026-09-15, `daily/2026-09-15`
- [x] **Record the HTTP status on photo failures.** The photo proxy records `ok`
      but not `statusCode`, so the admin Provider Health panel can't tell an expired
      photo name (400) from a quota block (429). Pass the status through to
      `recordStandaloneCall`. — 2026-09-17, `daily/2026-09-17`
