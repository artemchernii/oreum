@AGENTS.md

# Oreum

A tool that shows what happened to my big tech positions while I wasn't
looking, and why it matters. Personal project, single developer.
Roadmap and scope live in `PLAN.md`. Read it before proposing a feature.

## Project goal

Practise AI-assisted development end to end. So:
explain non-obvious decisions briefly instead of just emitting code.
If there are two reasonable approaches, name both in one sentence each
and recommend one.

## Stack

Next.js 16 (App Router) + React 19, TypeScript, pnpm.
Supabase (Postgres, auth), Vercel, Lightweight Charts.

## Commands

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — eslint (flat config, `eslint.config.mjs`)
- `pnpm exec tsc --noEmit` — typecheck (there is no separate npm script)

Always `pnpm`, never `npm` or `yarn`.

## Rules

- Scope is sacred. Do not add features outside the current milestone in
  `PLAN.md`. An idea beyond the milestone goes to "Later", not into code.
- Everything in this repo is English: code, comments, commits, docs, UI copy.
  No exceptions.
- API keys server-side only: route handlers or server actions.
  Never `NEXT_PUBLIC_` for anything that costs money.
- Every external data API call goes through a Supabase cache.
  Provider free tiers are tight — a direct call per render kills the quota.
- RLS is enabled when the table is created, not "later".
- The universe is a fixed, hand-curated list of tickers. Never widen it to
  a sector filter or to "all of NASDAQ". The list is the asset.

## Product invariants

These are not style preferences. Breaking one breaks the product.

- **Never predict price.** No forecasts, no targets, no scenarios about where
  a stock goes. Bull/bear is allowed only as an aggregation of existing
  arguments, one source link per claim.
- **Every AI-generated statement carries a source link.** No link, no line.
- **Impact direction comes from the edge type, not from headline sentiment.**
  A capex increase at a customer is mechanically a tailwind for a supplier.
  A headline "sounding positive" means nothing — the market trades
  expectations, and a wrong signal costs trust that doesn't come back.
- **Store headline, link, and our own summary. Never the full article text.**
  That is a licensing boundary, not a technical one.
- **The filtered-out counter is permanent UI.** It is the only place the
  product shows its work.

## Design

- Monochrome brand layer. The colour budget belongs to one thing: price
  movement, green up and red down. Nothing else in the UI uses green or red.
- Impact direction renders as a monochrome arrow, never a coloured badge.
- Numbers use a monospaced face with tabular alignment: prices, percentages,
  ratios, timestamps.
- shadcn is the design system. Compose with it; do not reinvent its
  primitives.
- Light and dark mode both work, always. No hardcoded hex outside tokens.

## Pitfalls

- Server Components by default. `"use client"` only where there is state or a
  browser API. Lightweight Charts is client-side.
- Stock prices are money: `numeric`, never `float`.
- Market data goes into the database in UTC; convert to a timezone only for
  display.
- Provider data arrives dirty: missing days, splits, after-hours prints.
  Never assume a series is contiguous.
- Real financial headlines run long — fifteen words and up. Test layouts with
  realistic headlines, not short mock ones.
- An event has an array of sources, not one. Deduplication merges the same
  story across outlets, so "TechCrunch +1 source" is the normal case.
- Exposure data goes stale. A stale exposure makes the impact engine
  confidently wrong, which is worse than having no exposures at all. Always
  store the review date alongside the value.

## Workflow

- Plan first, then code. Use plan mode for non-trivial tasks.
- Small commits, imperative mood.
- A branch per change, PR into `master`. Never commit directly to `master`.
- An architectural decision becomes a row in the decision log in `PLAN.md`.
  Decisions do not live in chat.
