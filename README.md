# Oreum

News about Microsoft is often news about Broadcom. Oreum is the tool that
tells you which.

## The problem

If you hold big tech, most of what moves your positions never carries your
ticker in the headline. Microsoft raising capex guidance is a Broadcom story.
An export restriction is an Nvidia story. A lab building its own silicon is a
custom ASIC story.

Meanwhile the news list on your broker's app is mostly SEO filler tagged with
your ticker to catch traffic. Ten items, two of which matter, and no
indication which two.

## How it works

The universe is fixed: around 25 big tech and adjacent companies, curated by
hand. Small enough that the connections between them can be mapped properly —
who buys from whom, who shares a foundry, who competes.

Each story is parsed once, deduplicated across outlets, and mapped onto that
graph. You see only what reaches your tickers, with a plain-English line
explaining how it got there and a link to the source.

## Features

**Feed** — what changed since you last looked, ranked by relevance to your
watchlist. Second-order events rank above direct ones, because you'd have
seen the direct ones anyway.

**Ticker page** — price and chart, five comparable metrics each with a
reference point, the company's specific exposures (China revenue, foundry
dependency, rate sensitivity), and why it's moving right now.

**Connections** — the graph edges that make the impact mapping explainable.
Every claim traces back to a source and an exposure figure you can check.

**Filtered-out count** — visible on every screen. The product's main job is
subtraction, so it shows how much it removed.

## What it deliberately doesn't do

- **No price predictions.** No targets, no forecasts, no "three scenarios".
- **No sentiment badges on headlines.** The market trades expectations, so
  headline tone and price movement barely correlate. Direction is shown only
  where a mechanism exists — a customer's capex increase is mechanically a
  supplier's tailwind.
- **No unsourced claims.** If a statement has no link, it doesn't ship.
- **No article text stored or reproduced.** Headline, link, and our own
  summary only.

## Status

Early. Two milestones are done, and neither of them touches real data.

- **M0** — scaffold deployed at <https://oreumapp.vercel.app>, Supabase
  project connected.
- **M1** — the Feed and Ticker screens exist and render, **on mock data**.
  Six companies, nine hand-written events, no network calls.

So the screens above are real and the data behind them is not. Nothing is
fetched, deduplicated, classified, or persisted yet — the watchlist doesn't
survive a reload, because there is no database table behind it.

The nearest real milestone is M2: auth and a watchlist that persists. The
part that makes the product worth using — the graph and second-order
impact — is M6, and there is a deliberate gate before it: if I'm not opening
the ticker page myself after two weeks, the hypothesis is wrong and the
project stops.

See `PLAN.md` for the full roadmap and what's actually built.

## Stack

In use today:

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind v4** + **shadcn/ui** — monochrome tokens; the colour budget is
  spent entirely on price movement
- **Supabase** — project connected, no schema yet
- **Vercel** — hosting

Decided but not yet installed:

- **Lightweight Charts** for candles and event markers (M9)
- **Massive** (formerly Polygon.io) for prices and news, **FRED** for macro (M3–M4)

## Running it

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase project URL and key
pnpm dev
```

`pnpm build` for a production build, `pnpm lint`, and `pnpm exec tsc --noEmit`
to typecheck. Always pnpm.

The app renders without Supabase credentials — M1 is entirely mock data. The
only thing that needs them is `/api/health`.

## Docs

- `PLAN.md` — roadmap, data model, and the decision log
- `CLAUDE.md` — conventions, product invariants, and known pitfalls
- `docs/logo.md` — brand assets and the rule for using them

## A note on how this is built

This is a solo project, written end to end with an AI assistant as a
deliberate exercise. Architectural decisions live in the decision log in
`PLAN.md` rather than in chat history, which is why that table reads like a
changelog of arguments rather than a list of features.
