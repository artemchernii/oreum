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

- [x] `pnpm dlx shadcn@latest init` — **before** writing tokens by hand:
  shadcn has its own CSS variable convention and `@theme inline` in
  `globals.css` is already set up for it
- [x] tokens: monochrome, colour reserved for price movement only
- [x] shell: top bar, watchlist sidebar, main area
- [x] Feed screen and Ticker screen, static, mock data only
- [x] event card as a component — this is the primary UI object
- [x] types match the eventual DB shape so M4–M6 don't require a rewrite
- [x] mock headlines of 15+ words, or layout bugs stay hidden until production
- [x] **one working session, no more**

### M2 — watchlist

**Done when:** I can add a ticker and it survives a reload.

- [ ] `pnpm add @supabase/supabase-js @supabase/ssr`
- [ ] `pnpm dlx shadcn@latest add @supabase/supabase-client-nextjs` — auth
  components from the Supabase registry (requires M1)
- [ ] Supabase auth (magic link)
- [ ] `watchlist` table + RLS policies
- [ ] GitHub and Google sign-in — a magic link is a poor first impression for
  someone you handed a link to, and Supabase's free sender allows two an hour
- [ ] ~~turn Deployment Protection back on~~ — **reversed 2026-08-27.** Vercel
  Authentication gates the whole site behind Vercel accounts, which locks out
  the people this is being shared with. RLS is what protects the data, and it
  is verified: anonymous reads return `[]`, forged inserts are rejected `42501`
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

## Design bundle — screen to milestone

`design/design_handoff_oreum_dashboard/` holds fourteen screens. The bundle is
labelled "M2" but spans most of the roadmap. What each screen actually belongs
to:

| Screen | Milestone |
| --- | --- |
| Login / register | M2 — **needs redesign**, the mock is password + Google, the plan is magic link |
| Onboarding (first watchlist) | M2 |
| Empty watchlist | M2 |
| Search results dropdown | M2 — pick from the universe, not free text |
| Not found (404) | M2 |
| Loading / skeleton | M3 |
| Error / offline | M3 |
| Feed, on real data | M5 / M6 |
| Ticker detail, on real data | M5, plus M6 for connections and the 30-day tally |
| Chart with event markers | M9 |
| Daily digest | M7 — **without** the unsourced AI summary card |
| Portfolio weighting | M8 |
| Account settings | Later |
| Alert settings | Later |
| Share watchlist | Later |

The last three have no milestone. They are plausible features that the design
reached for; by the scope rule they wait.

---

## Later (don't touch)

Price forecasting (never). Scenario simulator. Chat. Public pages for SEO.
Billing and paid tiers. Mobile app. Widening the universe beyond big tech.
Screeners. Multi-timeframe. A separate Python engine.

From the design bundle: account settings, alert rules and delivery channels,
share-a-watchlist links, and a command palette (the mock's search field reads
"Search ticker or command").

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
| 2026-08-07 | Sparkline built in M1, static path only | M3's objection is the per-ticker price series, not the component. A hardcoded path costs no quota and settles the row layout now instead of forcing a redesign when real data lands. M3's line is narrowed to the data |
| 2026-08-07 | Dark mode via `light-dark()`, keyed off both `.dark` and `prefers-color-scheme` | shadcn keys dark off `.dark`; M1 has no toggle, so a class-only setup would leave dark-mode users on a light UI. `light-dark()` declares every token once, so the two paths cannot drift. `.dark` / `.light` stay as escape hatches for a future toggle |
| 2026-08-07 | Green and red confined to `price-change.tsx` | keeping the entire colour budget in one component makes "nothing else is green or red" checkable in the build output rather than in review. Verified: exactly four chromatic colours ship in the stylesheet |
| 2026-08-07 | shadcn's `--destructive` and dark `--sidebar-primary` neutralised | both shipped chromatic (red, blue). An unused red token in the palette is an invitation to use it |
| 2026-08-07 | Timeframe control is static buttons, not shadcn `Tabs` | Radix `Tabs` is a client component and the control has no behaviour in M1. Styled spans give the same appearance server-rendered |
| 2026-08-07 | `Event` carries `summary` and `strength`; sparkline series kept off `Company` | summary and strength are in the data model and would otherwise need a migration. The price series belongs to the M3 cache table, not the companies row, so it lives in the mock as a separate map |
| 2026-08-07 | Metrics and exposures are separate objects | metrics compare across companies, exposures don't. A fifth slot that changes meaning per ticker breaks the row. Each metric also carries a reference anchor — a P/E without one is a number, not information |
| 2026-08-07 | Impact direction derives from edge type, not headline sentiment | the market trades expectations, so headline tone and price movement barely correlate. A wrong coloured badge costs trust, and trust is the whole product. Colour also stays reserved for price |
| 2026-08-07 | An event carries an array of sources | deduplication merges the same story across outlets, so "TechCrunch +1 source" is the normal case, not an edge case |
| 2026-08-07 | The filtered-out counter is permanent UI | it's the only place the product shows its work, and it forces measuring what the filter actually drops |
| 2026-08-07 | Exposures reviewed quarterly from 10-K / 10-Q segment data | stale exposures make the engine confidently wrong, which is worse than having none. Store the review date with the value |
| 2026-08-07 | English everywhere in the repo, including docs and UI copy | the universe is US big tech and the sources are English; a Ukrainian-only subscription market is too small. It follows that distribution has to be in English too |
| 2026-08-09 | Design bundle is the north star, `PLAN.md` is the authority | the design decides how it looks, the plan decides what it says and when it exists. Without stating this, every conflict gets re-argued. Reconciled tokens live in `docs/design-system.md` |
| 2026-08-09 | Neutrals are violet-tinted at hue 302°, not chroma-0 | matches the bundle and reads as intentional where a pure grey reads as unstyled. The monochrome build check now tests "no green or red" rather than "no chroma" |
| 2026-08-09 | Light mode derived from the dark baseline, same hue, mirrored lightness | the bundle is dark-only, but both modes are required. Derived light is accessible and provisional — it has not had a visual pass |
| 2026-08-09 | The bundle's `#f04438` lightened for the down colour | it measured 4.36:1 on `#201f22`, under AA, and cards are exactly where change values live. Hue and chroma unchanged so the identity survives |
| 2026-08-09 | Archivo for text, Geist Mono for every figure | the bundle sets Archivo for numerics, but it has no monospaced cut and the sidebar's aligned percentage column depends on tabular figures. Splitting the families applies the precedence rule directly |
| 2026-08-26 | CI runs `pnpm check`, not `pnpm build` | Vercel builds every PR and `next build` runs TypeScript, so duplicating it buys nothing. eslint is the real gap — Next 16 removed linting from `next build`, so it never ran automatically until now |
| 2026-08-26 | No husky / lint-staged | typecheck already runs via Vercel's build, the editor reports lint and type errors live, and none of the five real bugs this project has hit would have been caught by a pre-commit hook. CI plus branch protection covers the same ground without adding latency to every commit |
| 2026-08-26 | `master` protected, admins included | "never commit directly to `master`" was advisory and followed voluntarily. Protection makes it structural regardless of tool or machine. Escape hatch is Settings → Branches, not a flag |
| 2026-08-26 | `markdownlint-cli2` pinned as a devDependency | `pnpm dlx` resolves the latest release each run, so a new rule upstream would break CI with no change on our side |
| 2026-08-26 | `typecheck` runs `next typegen` before `tsc` | `LayoutProps` and `PageProps` are generated into `.next/types/`. Without typegen, `tsc --noEmit` passes on a machine that has built before and fails on a fresh checkout — CI caught this on its first run, which is the argument for having CI |
| 2026-08-27 | `proxy.ts` lives at `src/proxy.ts`, not the repo root | Next 16 renamed `middleware` to `proxy` and requires the file level with `app`. At the root it is silently ignored — no error, no build output — and auth still appears to work because the data access layer redirects anyway. The build printing `ƒ Proxy (Middleware)` is the only signal it is wired up |
| 2026-08-27 | Proxy refreshes cookies; authorisation lives in `src/lib/auth.ts` | Next advises against logic in Proxy and against network calls there. `getClaims()` verifies the JWT locally, so Proxy stays a cookie operation. `requireUser()` revalidates with `getUser()` next to the queries, which is what makes the answer trustworthy |
| 2026-08-27 | `next` is passed to the login form as a prop, not read with `useSearchParams` | `useSearchParams` opts the subtree out of prerendering, so the server shipped an empty Suspense fallback and the form only appeared after hydration |
| 2026-08-27 | The universe is enforced by a foreign key, not by the form | `watchlist.symbol` references `companies.symbol`, so "pick from the universe, not free text" holds even if the UI is bypassed |
| 2026-08-27 | Symbols with no mock price render an em dash | 25 companies are seeded, 6 have mock quotes. A plausible invented number would hide exactly the gap M3 exists to fill |
| 2026-08-27 | Magic link is sent from a server action, not the browser | PKCE writes a code verifier when the link is requested and reads it back in the callback. Requesting from a client component put the verifier in browser storage while the callback looked in server cookies — "PKCE code verifier not found in storage". Sending server-side keeps both halves in one httpOnly store, and removes the last client component from M2 |
| 2026-08-27 | `/auth` is excluded from the proxy matcher entirely | the callback is the request that creates a session; running a second Supabase client over the same cookies first is how the verifier goes missing. Allowing it past the redirect was not enough — the proxy had to not run at all |
| 2026-08-27 | Magic links land on `/auth/confirm` via `token_hash`, not `?code=` PKCE | a magic link is opened from a mail client, usually in a new tab or a different profile than the one that requested it. PKCE needs a verifier written at request time and read at click time; any mismatch fails with "PKCE code verifier not found in storage", which it did twice. `verifyOtp` needs no verifier — the token is the whole credential. Requires the email template to send `{{ .TokenHash }}`; see `docs/auth.md` |
| 2026-08-27 | Deployment Protection stays **off** | reverses the 2026-08-06 debt. It was logged on the assumption that real rows meant "protect the site"; the product now has intended users — a handful of friends — and Vercel Authentication would require each of them to hold a Vercel account on the team. Data is protected by RLS, which is verified, not by hiding the URL |
| 2026-08-27 | GitHub and Google sign-in alongside magic link | sharing with a few people makes an inbox round-trip a bad first impression, and the free-tier sender allows two emails an hour. OAuth starts and ends in the same browser, so PKCE works there — `/auth/callback` was kept for exactly this |
| 2026-08-27 | Provider brand marks render in `currentColor` | Google's logo is blue, red, yellow and green. Dropping it in as-is would put red and green on screen for something unrelated to price movement |
| 2026-08-27 | Ideas that aren't milestones live in `docs/ideas.md` | guest mode, a command palette and the onboarding stepper each have a real case and no milestone. A holding pen keeps them recorded without becoming scope |
| 2026-08-27 | OAuth buttons render only for providers listed in `AUTH_PROVIDERS` | `signInWithOAuth` returns an authorize URL happily for a disabled provider — the failure only appears once the browser follows it, as raw Supabase JSON with no way back to the app. There is no way to ask Supabase which providers are enabled with a publishable key, so it is declared server-side |
| 2026-08-27 | The "check your inbox" screen polls `/api/session` | the magic link opens in whatever the mail client launches, leaving the requesting tab stranded. Polling rather than BroadcastChannel: the sign-in may have happened in a window that is already closed, and a broadcast has no listener then. The probe returns a boolean and nothing else |
