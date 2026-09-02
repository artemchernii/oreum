@AGENTS.md

# Oreum developer guidance

Oreum is a data-driven market-intelligence product. Read [`PLAN.md`](PLAN.md)
before proposing work and the relevant document in `docs/` before changing a
domain area.

## Stack and commands

Next.js 16 App Router, React 19, TypeScript, pnpm, Supabase, Vercel, and
Tailwind/shadcn.

- `pnpm dev` — development server
- `pnpm build` — production build
- `pnpm check` — typecheck, lint, Markdown lint, and tests
- `pnpm typecheck` / `pnpm lint` / `pnpm lint:md` / `pnpm test` — individual checks
- `pnpm db:types` — regenerate `src/lib/database.types.ts`

Always use pnpm.

## Product and intelligence invariants

- Math decides. LLM explains.
- Event ≠ Signal ≠ Impact ≠ Relevance ≠ Attention.
- Direction ≠ Attention.
- Preserve facts before deriving intelligence.
- Observed facts, known events, and inferred relationships must remain distinct.
- The graph discovers possible impact; it does not decide attention.
- Attention is deterministic, experimental, and must be backtestable.
- Attention thresholds are absolute, never rank-normalized: a day with zero
  items must be possible, or a quiet day cannot exist.
- Impact direction derives from the relationship and event type, never from
  headline sentiment.
- The universe is a fixed, hand-curated list. Widening it is a roadmap
  decision, not a filter change.
- The filtered-out counter is permanent UI — the one place the product shows
  its work.
- Do not present arbitrary weights as final truth.
- Do not use mock intelligence as production truth.
- Technical indicators are context, not trading recommendations.
- Oreum never forecasts prices or tells users what to buy or sell.
- Every explanation must retain evidence and source attribution.

## Data and security rules

- Live market state and historical daily bars are different data layers.
- Historical price data is finalized; live data carries provider timestamps and
  freshness state.
- Every external data call goes through an appropriate cache or persistence
  boundary; never fetch paid data directly during rendering.
- API keys stay server-side. Never expose paid keys through `NEXT_PUBLIC_`.
- Enable RLS in the same migration that creates a Supabase table.
- Scope user data with `auth.uid()`; `TO authenticated` alone is not ownership.
- Never use editable user metadata for authorization.
- Money and provider quantities use types that preserve their actual precision.
- Store source facts and links, not full article text.
- Never assume a market series is contiguous.
- Machine endpoints must be excluded from the proxy matcher.
- Regenerate `database.types.ts` after every schema change.

## UI rules

- The Feed answers “What happened?”
- The Ticker answers “Why is it happening?”
- Email answers “Do I need to care?”
- Visual weight must distinguish observed data, inference, confidence, and
  attention.
- Positive/negative direction must not be visually conflated with attention.
- Green and red may communicate positive/negative direction, but never
  attention; neutral, inferred, and attention states use separate semantics
  documented in `docs/design-system.md`. The current implementation reserves
  those colors to price movement.
- Dark is the designed baseline; light remains supported.
- Use Geist Mono for prices, percentages, ratios, timestamps, and tickers.
- Use shadcn primitives rather than new one-off primitives.

## Workflow

- Plan non-trivial work before coding.
- Keep scope within the active phase in `PLAN.md`.
- Verify behavior instead of inferring it from a green build.
- Write a unit test where logic could be quietly wrong (date arithmetic,
  percentage math, message parsing). Most real bugs here were integration or
  configuration; verify those against the real thing instead.
- Use a branch per change and keep commits small and imperative.
- Record material architectural decisions in `docs/decisions.md`.
