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

Always use pnpm. CI runs `pnpm check` on every PR; it does not run
`pnpm build` — Vercel builds every PR, and `next build` runs TypeScript but
not eslint.

Everything in this repo is English: code, comments, commits, docs, UI copy.

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
- Regenerate `database.types.ts` after every schema change. A stale one is
  worse than none: it type-checks against a schema that no longer exists.
- Market data goes into the database in UTC; convert to a timezone only for
  display.
- An event has an array of sources, not one. Deduplication merges the same
  story across outlets, so "Reuters +2 sources" is the normal case.
- Exposure data goes stale. A stale exposure makes the impact engine
  confidently wrong, which is worse than no exposure at all; the review date
  ships with the value.
- `.env.local` does not end in a newline. A naive `>>` append glues the new
  variable onto the last one and corrupts it — this destroyed an API key
  once. Append with a leading `\n`, then verify each variable is on its own
  line.

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
- No hardcoded hex outside the token layer; `docs/design-system.md` is the
  reconciled authority the code implements.
- Use Geist Mono for prices, percentages, ratios, timestamps, and tickers.
- Use shadcn primitives rather than new one-off primitives.
- Server Components by default; `"use client"` only where there is state or
  a browser API. Charting libraries are client-side.
- Real financial headlines run fifteen words and up. Test layouts with
  realistic headlines, not short mock ones.

## Working agreement

- **Show the work as a checklist.** Before multi-step work, list the steps;
  update the list as they land — done, in progress, blocked, skipped. It
  replaces a narrated log, not the reasoning behind a decision. One line per
  step, no ceremony for a single-step change.
- **Test-first where a test is warranted at all.** When logic could be quietly
  wrong — date arithmetic, percentage math, threshold comparisons, message
  parsing — write the failing test, watch it fail, then implement. A test that
  has never failed has not been shown to test anything.
- The rule below still decides *whether* a test is warranted. Integration and
  configuration are verified against the real thing instead, because that is
  where nearly every real bug here has come from.
- **Find the cause before changing anything.** When something fails, say what
  you expected, what happened, and the smallest thing that reproduces it. Then
  find the line that is actually wrong. A change that makes a symptom go away
  without explaining why it appeared is a guess — and in this repo those
  guesses were usually integration or configuration problems wearing a
  code-shaped disguise. Change one thing at a time, or you will not know which
  one worked.
- **Never write prose before a tool call.** Any text streamed ahead of a tool
  call gets collapsed by the terminal when the tool renders, so an
  explanation, a review, or a set of findings placed before tool work is
  destroyed while it is being read. Do every tool call first — with no
  preamble, no "let me check", no acknowledgement — then write once, at the
  end. This is absolute: a single line of greeting before a `Bash` call is
  still a line that vanishes. It applies to skills too, and skills are the
  worst case rather than the rule: `/handoff`, `/ship` and `/migrate` each go
  in their own turn, after the reading part has been delivered and asked for.
  When a request has several parts, order them so all tool work precedes all
  prose.
- **End every reply with what to do next.** The last thing in every response is
  a `Next` section: one to three numbered steps, one plain line each, the step
  to do first at the top. Give the exact command or the exact thing to type
  where there is one. Plain words, no jargon. When the work is finished and
  nothing is waiting, say so in one line instead of inventing a step. A reply
  that explains what happened without saying what to do about it is not
  finished.

## Workflow

- Plan non-trivial work before coding. Explain non-obvious decisions briefly;
  when two reasonable approaches exist, name both in a sentence each and
  recommend one.
- Keep scope within the active phase in `PLAN.md`. An idea beyond it goes to
  the plan's later sections, not into code.
- **Verify, don't assert.** A green build proves the code compiled, not that
  it does what you claim. Check the built output, curl the endpoint, compute
  the number — then say what you checked and what came back, and say plainly
  what you could not verify.
- Write a unit test where logic could be quietly wrong (date arithmetic,
  percentage math, message parsing). Most real bugs here were integration or
  configuration; verify those against the real thing instead.
- Use a branch per change and keep commits small and imperative. Never commit
  directly to `master`.
- Do not stack a PR on another PR's branch. When the base merges and is
  deleted, GitHub does not always retarget in time, and the stacked PR merges
  into a dead branch — this has happened once. Branch from `master` and wait.
- `/ship` has the branch-to-merge loop; `/migrate` has the migration loop.
  Follow them rather than improvising.
- Record material architectural decisions in `docs/decisions.md`.
