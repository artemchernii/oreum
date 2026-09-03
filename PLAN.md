# Oreum — implementation plan

Oreum is a data-driven market-intelligence tool for investors who want to
understand what is happening in the market without constantly researching it.

## Product definition

Oreum answers four questions:

- What changed?
- How significant is it?
- What does it affect?
- How much attention does it deserve for me?

The problem it solves is noise. A single holding can generate ten or fifteen
alert emails a day, and none of them get read. Oreum inverts that: one or two
emails a day, sent only when something crosses an attention threshold, with
the platform as the investigation surface behind them.

Oreum is not a trading platform, stock picker, investment adviser, generic news
aggregator, AI news summarizer, or engagement-maximising system. A quiet day is
a successful result.

The product surfaces are:

- **Email:** Do I need to care? — the primary surface and the daily filter
- **Feed:** What happened?
- **Ticker:** Why is it happening?

The core rule is **math decides; the LLM explains**. Event, signal, impact,
relevance, and attention are separate concepts.

The differentiator is second-order intelligence over a small, densely
connected universe: one company's capex is another's revenue. Direct news
about a holding the investor will see anywhere; the connection they would
have missed is the product.

## Current foundation

These items exist in the repository today:

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4, and shadcn/ui
- Supabase SSR authentication with magic link, GitHub, and Google support
- `companies` and per-user `watchlist` tables with RLS
- `daily_bars` and `market_days` tables with RLS
- Massive grouped-daily price ingestion with payload validation
- Supabase-backed historical price cache and gap-filling cron
- price-cache freshness health reporting
- benchmark ETF rows, machine-readable sectors, and per-company cohort proxies
- a real Ticker price chart built from cached daily bars
- feed and ticker UI shells
- loading, error, empty, and not-found states
- observation maths over finalized bars — returns, rolling volatility,
  volatility-adjusted and benchmark-relative returns, volume against its own
  baseline — computed on demand rather than stored
- a threshold replay (`scripts/replay.ts`) that reports the quiet-day rate and
  emails per week over the held history; results in `docs/intelligence.md`
- unit tests for provider parsing, price calculations, freshness, observation
  maths, and ingestion date logic

Some intelligence functionality is mock/static only. Mock events, impacts,
edges, metrics, and exposures are UI fixtures, not production intelligence.

## Phase 0 — Foundation

**Goal:** The platform investigates with real data it already has.

- benchmark series (market and sector ETFs) added to ingestion — the
  grouped-daily response already contains them
- machine-readable sector reference data
- real price chart on the Ticker built from cached daily bars
- data-quality checks on the historical pipeline

**Gate:** The ticker page shows a real chart and real history, and benchmark
data exists for relative-performance work.

## Phase 1 — The Email (Attention v1)

**Goal:** One email a day that is worth opening, and silence when nothing is.

- observations computed from finalized bars
- price, volume, and relative-performance anomalies with absolute,
  volatility-adjusted thresholds — fire or stay silent, never a per-day rank
- historical replay: how many emails would these thresholds have sent, and
  would the known important situations have made the cut
- a labeled evaluation set: known event dates as weak labels, plus
  retrospective human judgment, recorded point-in-time
- news ingestion across the universe, deduplicated, one LLM classification
  call per story
- direction derived from the event and relationship type, never from
  headline sentiment
- daily email with the filtered-out counter: what fired, what was suppressed
- “Nothing significant requires your attention today” as a first-class output

The threshold is experimental until historically evaluated. RSI and moving
averages are ticker context, not attention inputs.

**Gate:** The developer reads the email daily and stops reading raw
broker and news alerts. If after two weeks the email is not being opened,
stop and rethink before building further.

## Phase 2 — Live market layer

**Goal:** Current prices during market hours, honestly labelled.

- provider decision first: delay tolerance and cost, recorded in
  `docs/decisions.md` — the current provider cannot serve the current day
- current price and near-live volume
- market open/closed status from a live source
- intraday-updating chart
- freshness semantics extended to the live layer

**Gate:** The platform shows the current session, clearly separated from
finalized history, with provider timestamps visible.

## Phase 3 — Event intelligence

- earnings calendar and structured company events
- guidance and analyst revisions
- macro events
- event-to-signal conversion
- aggregation of related signals into one underlying situation
- actual/expected/previous facts only once a consensus-estimates source is
  justified — estimates data is licensed and expensive, and is not assumed

**Gate:** Oreum can explain why an important situation happened without
treating the source story, signal, and attention decision as the same thing.

## Phase 4 — Context and impact

- roughly sixty hand-curated, typed relationships between companies
- one-hop propagation; a second hop only across two observed edges
- impact direction from the edge type
- second-order items in the Feed and the email
- impact confidence
- observed relationships distinguished from inferred propagation

**Gate:** Oreum can explain why something matters even when the user's ticker
is not mentioned directly.

The graph discovers possible impact. It does not decide attention.

## Phase 5 — Intelligence and explanation

- richer LLM explanations with evidence and source attribution
- attention 0–10 ranking, grown out of the Phase 1 threshold
- chart event and attention markers
- contextual RSI, volume, moving averages, and relative performance
- intelligence-item aggregation across signal families
- pre-market and post-market intelligence

The LLM explains deterministic facts, signals, and relationships. It is not
the authority for attention scoring.

## Phase 6 — Personalisation and expansion

- broker imports
- positions and sizing
- portfolio allocation
- custom watchlists
- preferences and advanced relevance
- expanded macro/sector coverage
- feedback loops
- additional asset classes

## Dependency order

1. Freeze the domain vocabulary and data lineage.
2. Preserve and verify the historical price pipeline.
3. Add benchmark and sector reference data.
4. Replace the chart placeholder with cached bars.
5. Build historical observations from finalized bars.
6. Build absolute anomaly thresholds and the replay script.
7. Add news ingestion and per-event classification.
8. Ship the daily email with the filtered-out counter.
9. Decide the live provider; add live prices, status, and the moving chart.
10. Add structured events and aggregation.
11. Add the curated graph and impact.
12. Grow attention 0–10 and Feed ranking out of the threshold.
13. Add LLM explanations with evidence.
14. Add positions, broker imports, and advanced personalisation.

## Deliberate boundaries

- No price forecasts, targets, or trading recommendations.
- No arbitrary attention weights presented as final truth.
- No rank-normalized attention: a day with zero items must be possible.
- Impact direction comes from the relationship type, never from how a
  headline sounds.
- The universe is a fixed, hand-curated list. Widening it is a roadmap
  decision, not a side effect.
- The filtered-out counter is permanent UI — the one place the product shows
  its work.
- No direct provider call from a render when the data belongs in a cache.
- No full article text stored or reproduced.
- No inferred relationship presented as an observed fact.
- No mock intelligence treated as production truth.
- No feature outside the active phase without an explicit roadmap decision.

## Later (don't touch)

Carried over from the original plan and still binding: price forecasting
(never), scenario simulators, chat, public SEO pages, billing and paid tiers,
mobile apps, screeners, multi-timeframe analysis, a separate Python engine,
and widening the universe beyond the curated list.

## Open questions

- Email timing: morning (“yesterday's session plus today's calendar”) versus
  evening (“today's session”) — partly determined by when the provider
  actually publishes finalized bars, which is undocumented and should be
  measured.
- Live-data provider: true real-time versus 15-minute delayed, which
  provider, at what cost and rate limits. Gates Phase 2.
- News licence: Massive Basic includes the news endpoint at no cost, but what
  the licence permits regarding storing headlines and links is unconfirmed.
- Deduplication method: start with ticker, title similarity, and a time
  window; decide whether embeddings are needed against real data, not in the
  abstract.
- Consensus-estimates source, if actual/expected facts are ever justified.
- Domain: `oreum.markets` is the likely candidate and is not bought yet.

## Decision log

The redesign decisions are recorded in [`docs/decisions.md`](docs/decisions.md).
Implementation-specific historical decisions remain visible in git history and
the relevant operational docs.
