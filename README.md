# Oreum

Oreum is a data-driven market-intelligence tool for investors who want to know
what changed, why it matters, and whether it deserves their attention.

It is designed for attention efficiency rather than engagement. A quiet day is
a successful result. Oreum is not a trading platform, stock picker, investment
adviser, generic news aggregator, or AI commentary feed.

## Product surfaces

- **Email:** Do I need to care? — the primary surface: one or two emails a
  day, silent when nothing matters
- **Feed:** What happened?
- **Ticker:** Why is it happening?

The canonical pipeline is:

```text
source data → normalized facts → observations/events → signals
→ context → impact/relevance → attention → intelligence item
→ explanation → feed/ticker/email
```

Math decides. The LLM explains. Event, signal, impact, and attention remain
separate concepts.

## Current status

The repository contains the foundation:

- Next.js 16, React 19, TypeScript, Tailwind v4, and shadcn/ui
- Supabase authentication, RLS, companies, and watchlist
- historical daily OHLCV cache and market-day tracking
- Massive provider validation and gap-filling ingestion
- feed and ticker UI shells
- loading, error, empty, and not-found states
- tests for the current pure data logic

Current market data is historical daily data. Live prices, intraday
observations, attention scoring, real events, graph context, explanations, and
email are planned, not implemented. Existing mock events and impacts are UI
fixtures only.

See [`PLAN.md`](PLAN.md) for the implementation roadmap and
[`docs/architecture.md`](docs/architecture.md) for the system model.

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Useful commands:

```bash
pnpm check
pnpm test
pnpm build
```

Supabase credentials are required for authenticated pages and cached prices.
See [`docs/auth.md`](docs/auth.md) and [`docs/prices.md`](docs/prices.md).
