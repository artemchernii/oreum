# Oreum — plan

**What it is:** a tool that shows what happened to my big tech positions
while I wasn't looking, and why it matters.
**Why:** practise AI-assisted development end to end, and get a tool I use.
**Domain:** likely `oreum.markets`

---

## The product in one paragraph

The universe is fixed: ~25 big tech and adjacent companies. They are densely
connected — one company's capex is another's revenue, and TSMC is a
bottleneck for half the list. The product parses each event once, maps it onto
a graph of connections, and shows a user only what touches their tickers. The
value is **second order**: news about Microsoft that moves Broadcom. Direct
news about Broadcom, people will see anyway.

The product **never predicts price**.

---

## Stack (decided)

- **Next.js (App Router)** + **Supabase** — Postgres, auth, cron.
- **Vercel** — hosting.
- **Lightweight Charts** — charts.
- **Data:** Polygon.io (prices, news). FRED for macro. Alpha Vantage as backup.

A separate Python engine is **not in the MVP**.

---

## Scope rule

The MVP is what I use **myself, daily**. Everything else waits.
If a feature doesn't fit a milestone below, it goes to "Later", not into code.

---

## Data model

**Global** — processed once, shared across all users:

- `companies` — the universe (~25). Beyond the ticker: five comparable
  metrics, each with a reference anchor (5-year average, prior year, peer
  figure).
- `exposures` — company-specific drivers: hyperscaler capex share, China
  revenue, foundry dependency, rate sensitivity. Hand-curated from 10-K and
  10-Q segment data, with a review date on every row. Separate from metrics
  because metrics compare across companies and exposures do not.
- `edges` — typed connections between companies (`customer`, `foundry`,
  `supplier`, `competitor`). Hand-curated, ~60 rows.
- `events` — a story after deduplication: kind, nodes, strength 1–3, our own
  one-line summary, and an **array** of source links.
- `event_impacts` — event × company, with order (direct or via edge),
  direction, and a plain-English reason. Direction is derived from the edge
  type, never from headline sentiment.

**Per user:** `watchlist`, later `positions`.

A personal feed is `event_impacts ⨝ watchlist`. Plain SQL, no LLM.

---

## Milestones

### M0 — scaffold

**Done when:** an empty app opens on a live URL.

- [x] repo + `CLAUDE.md`
- [x] `create-next-app`, TypeScript, Tailwind
- [x] Supabase project, `.env.local`, connection verified
- [x] Vercel deploy — <https://oreumapp.vercel.app>
- [x] favicon + logo from `/brand` in place

### M1 — design minimum

**Done when:** two screens render on mock data and I'm not embarrassed by them.

- [ ] `pnpm dlx shadcn@latest init` — **before** writing tokens by hand:
  shadcn has its own CSS variable convention and `@theme inline` in
  `globals.css` is already set up for it
- [ ] tokens: monochrome, colour reserved for price movement only
- [ ] shell: top bar, watchlist sidebar, main area
- [ ] Feed screen and Ticker screen, static, mock data only
- [ ] event card as a component — this is the primary UI object
- [ ] types match the eventual DB shape so M4–M6 don't require a rewrite
- [ ] mock headlines of 15+ words, or layout bugs stay hidden until production
- [ ] **one working session, no more**

### M2 — watchlist

**Done when:** I can add a ticker and it survives a reload.

- [ ] `pnpm add @supabase/supabase-js @supabase/ssr`
- [ ] `pnpm dlx shadcn@latest add @supabase/supabase-client-nextjs` — auth
  components from the Supabase registry (requires M1)
- [ ] Supabase auth (magic link)
- [ ] `watchlist` table + RLS policies
- [ ] **turn Deployment Protection back on** — disabled since 2026-08-06 to
  diagnose a 404. Real data appears here, so it goes back before that happens
- [ ] add / remove a ticker (pick from the universe, not free text)

Optional: `npx skills add supabase/agent-skills`.

### M3 — data and cache

**Done when:** I see current prices and don't hit a rate limit.

- [ ] server layer (route handlers only, key never in the client)
- [ ] cache table in Supabase
- [ ] loading and error states in the UI
- [ ] sidebar sparklines — they need a price series per ticker per page load,
  which is exactly what eats a free tier. They belong here, not in M1

### M4 — universe and events

**Done when:** a day's worth of events lands in the database, deduplicated.

- [ ] `companies` and `exposures` — 25 companies, seeded by script
- [ ] news ingestion across the universe + FRED for macro
- [ ] deduplication: one story from five outlets becomes one event with five
  source links
- [ ] classification in a single LLM call per event, result into `events`
- [ ] store headline, links, and our own summary. **Never the full text**

### M5 — first order

**Done when:** I open the ticker page instead of my broker's app.

- [ ] ticker page: price, metrics with anchors, exposures, events
- [ ] every event carries a reason line and a source link
- [ ] filtered-out counter — if the filter drops one item in ten, the filter
  isn't working, and this is where that becomes visible
- [ ] **gate:** if I'm not opening this myself after two weeks, the hypothesis
  is dead and we stop here

### M6 — graph and second order

**Done when:** I see at least one connection a week that I'd have missed.

- [ ] `edges`, seeded by script
- [ ] `event_impacts` — propagate an event across the graph
- [ ] main feed with ranking
- [ ] rule: second order ranks above direct when the primary company isn't in
  the watchlist
- [ ] 30-day tally on the ticker page: tailwinds vs headwinds, derived from
  `event_impacts`, every one linking to a source

This is the core of the product. Everything before it is infrastructure.

### M7 — digest

- [ ] cron: each morning before the US open
- [ ] five items, no more
- [ ] email

### M8 — portfolios

- [ ] CSV import from three brokers (each has its own format — budget a week)
- [ ] exposure breakdown **by driver**, not by sector
- [ ] position weights refine feed ranking

### M9 — depth

- [ ] Lightweight Charts, candles, event markers on the time axis
- [ ] bull / bear as an aggregation of arguments, **one source per claim**

---

## Later (don't touch)

Price forecasting (never). Scenario simulator. Chat. Public pages for SEO.
Billing and paid tiers. Mobile app. Widening the universe beyond big tech.
Screeners. Multi-timeframe. A separate Python engine.

---

## Open questions

- Domain: `oreum.app` is taken. Likely `oreum.markets` — confirm and buy.
  The Vercel project is still named `oreum.app`; rename it with the domain.
- News feed: which provider, what it costs, and what the licence permits
  regarding headlines and links.
- Deduplication: embeddings or something simpler on the headline — decide
  against real data, not in the abstract.
- Does the universe include companies I don't hold? Yes — TSMC matters because
  half the list depends on it. But the inclusion criterion needs to be written
  down.
- Polygon: which tier covers a single user?
- Cron: Supabase `pg_cron` or Vercel Cron? With Deployment Protection on, an
  external `pg_cron` hits the SSO redirect and needs a bypass token.
- Is a client-side cache layer needed, or do Server Components cover it?

---

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08 | Name Oreum, domain oreum.app | 오름 means "ascent"; cleaner than Moa on trademarks |
| 2026-08 | Next.js + Supabase | current default, least friction at the start |
| 2026-08-05 | Tailwind v4 instead of CSS Modules | shadcn requires Tailwind; otherwise styles would be rewritten in M1 |
| 2026-08-05 | `NEXT_PUBLIC_` for the Supabase URL and publishable key | the key is designed for the browser and rests on RLS; magic-link auth in M2 runs client-side. The "no `NEXT_PUBLIC_`" rule still holds for paid keys such as Polygon |
| 2026-08-05 | New publishable / secret keys instead of legacy anon / service_role | new keys revoke individually; rotating the legacy JWT secret kills every key and logs everyone out at once |
| 2026-08-05 | `@supabase/supabase-js` not installed in M0 | nothing consumes it in M0 — tables and auth are M2 |
| 2026-08-06 | `oreum.app` is out, domain likely `oreum.markets` | `.app` was taken. The name stands; only the zone changes |
| 2026-08-06 | Deployment Protection temporarily disabled | to diagnose a 404 without the SSO redirect. This is debt: it goes back on in M2 |
| 2026-08-06 | Vercel Framework Preset is `Next.js`, not `Other` | with `Other`, Vercel discarded `.next` and published only `public/`: green build, 404 on everything but static files. If "build fine, no pages" ever recurs, look here first |
| 2026-08-06 | Universe is an explicit ~25-ticker list, not a sector filter | the list and its driver profiles are filled in by hand. On 5000 tickers nobody can build this graph; on 25 it takes a weekend |
| 2026-08-06 | Heavy processing per event, light per user | the event table is global. Otherwise cost scales with users and margin never appears |
| 2026-08-06 | The main screen is an event feed, not a dashboard of tiles | the user's problem is delta ("what changed"), not state ("how are things"). State is available everywhere for free |
| 2026-08-06 | Investment thesis journal rejected | it requires ongoing user effort. Products like that die in week two |
| 2026-08-06 | AI does not forecast price | in finance the cost of error is asymmetric: one hallucination kills trust in everything. Bull/bear is allowed only as an aggregation of arguments with a source per claim |
| 2026-08-06 | Second order ranks above direct | a user sees direct news about their own company anyway. The value is where they wouldn't have made the connection |
| 2026-08-06 | CSV portfolio import deferred to M8 | watchlist membership is enough for ranking; position sizes only refine it. Three broker formats is a week of dull work, not a starting task |
| 2026-08-06 | Store headline, links, and our own summary | full article text is a licensing question, not a technical one |
| 2026-08-07 | Metrics and exposures are separate objects | metrics compare across companies, exposures don't. A fifth slot that changes meaning per ticker breaks the row. Each metric also carries a reference anchor — a P/E without one is a number, not information |
| 2026-08-07 | Impact direction derives from edge type, not headline sentiment | the market trades expectations, so headline tone and price movement barely correlate. A wrong coloured badge costs trust, and trust is the whole product. Colour also stays reserved for price |
| 2026-08-07 | An event carries an array of sources | deduplication merges the same story across outlets, so "TechCrunch +1 source" is the normal case, not an edge case |
| 2026-08-07 | The filtered-out counter is permanent UI | it's the only place the product shows its work, and it forces measuring what the filter actually drops |
| 2026-08-07 | Exposures reviewed quarterly from 10-K / 10-Q segment data | stale exposures make the engine confidently wrong, which is worse than having none. Store the review date with the value |
| 2026-08-07 | English everywhere in the repo, including docs and UI copy | the universe is US big tech and the sources are English; a Ukrainian-only subscription market is too small. It follows that distribution has to be in English too |
