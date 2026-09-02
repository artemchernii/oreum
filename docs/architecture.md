# Architecture

## System shape

Oreum has a shared global intelligence layer and a separate user-personalisation
layer.

```text
source data
  ↓
normalised facts
  ↓
observations + events
  ↓
signals
  ↓
context / impact / relevance
  ↓
deterministic attention
  ↓
intelligence items
  ↓
LLM explanations
  ↓
feed / ticker / email
```

The database does not need to mirror this diagram one table at a time. The
separation is conceptual and should guide boundaries as the system grows.

## Existing foundation

The repository currently contains:

- `companies` — the initial curated company universe
- `watchlist` — per-user symbols
- `daily_bars` — finalized historical OHLCV
- `market_days` — historical market-open state and ingestion completeness

These are defined in `supabase/migrations/0001_init.sql` and
`supabase/migrations/0002_daily_bars.sql`, with RLS enabled at creation.

Provider integration and normalization currently live in
`src/lib/massive.ts`; cache reads are in `src/lib/quotes.ts`; ingestion is in
`src/lib/ingest-prices.ts` and `src/app/api/cron/prices/route.ts`.

## Market-data clocks

Live/near-live market state is separate from finalized historical data.

- **Live:** current price, near-live volume, market status, provider timestamp
- **Intraday:** observations, anomalies, signals, and possible attention updates
- **Event-driven:** earnings, news, macro events, and material announcements
- **Daily:** finalized bars, daily summaries, and email

The current Massive Basic integration supplies historical daily data only. That
is a provider limitation, not the final product architecture. It is, however,
sufficient for the v1 daily email: the primary surface works from finalized
bars, and the live layer is a separate phase gated on a provider decision.

The grouped-daily response already contains every US ticker, including the
benchmark ETFs the relative-performance signals need; ingestion keeps only
the universe today, and widening that filter to include benchmarks is a
Phase 0 change, not a new integration.

## User boundary

Global facts, observations, signals, context, and intelligence can be processed
once and shared. Watchlists and future positions determine personal relevance.
User data remains protected by Supabase RLS and must not be mixed into global
reference data.

## Trust boundary

Source data is external and untrusted. Normalization validates its shape.
Derived observations and signals are deterministic. Graph propagation may be
inferred. LLM explanations must preserve evidence and must not override
deterministic attention decisions.

## Future dependencies

The natural dependency order is historical and live market data, then
observations, signal families, backtesting, attention, events, context/impact,
explanations, and finally email and advanced personalisation. See `PLAN.md` for
the roadmap and gates.
