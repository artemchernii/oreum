# Intelligence model

## Canonical pipeline

```text
source data → normalized facts → observations/events → signals
→ context → impact/relevance → attention → intelligence item
→ LLM explanation → feed/ticker/email
```

The layers are related but must not be collapsed prematurely.

## Vocabulary

### Fact

A normalized representation of source information. For measurable events,
preserve actual, expected/consensus, previous, and reference values before
deriving meaning.

### Observation

A measured or calculated property of market data, such as daily return, volume
ratio, sector-relative return, or volatility-adjusted return.

### Event

A structured representation of something that happened: an earnings release,
guidance change, Fed decision, analyst revision, CPI surprise, or material
company announcement.

### Signal

An analytical conclusion derived from events and/or observations, such as an
unusual price move, unusual volume, earnings surprise, or unusual relative
performance.

Signal type does not determine signal strength.

### Context

The surrounding market, sector, company, macro, technology, geography, and
portfolio information needed to interpret a signal.

### Impact

What another entity could potentially be affected by and through which
relationship. Impact is not attention.

### Relevance

How relevant an impact or signal is to a particular investor's watchlist or
portfolio.

### Attention

How much this investor should care about the situation right now. Attention is
deterministic and initially experimental, with a target display of 0–10.

### Intelligence Item

A user-facing aggregation of related signals, events, impacts, context,
evidence, and attention.

### Explanation

A concise human-readable account of why the Intelligence Item matters, backed
by source evidence and clearly marked inference.

## Context and graph

Context is interconnected rather than a strict hierarchy:

```text
macro ↔ market ↔ sector ↔ company ↔ portfolio
```

Relationships may include supplier, customer, competitor, sector, technology,
geography, macro, and market relationships. The graph discovers possible
propagation paths. It does not decide attention.

Observed relationships, known events, and inferred propagation must remain
distinguishable. Inference must not be presented as certainty.

## Attention Engine v1

Initial inputs may include:

- 1D return
- rolling volatility
- volatility-adjusted return
- market and sector return
- market-relative and sector-relative return
- volume and volume versus rolling baseline

Initial signal families are price anomaly, relative-performance anomaly, and
volume anomaly. RSI and moving averages are ticker context, not core attention
inputs.

The final weights are not decided. Any first scoring model is an experiment and
must be validated historically against simple baselines.

Two structural rules are decided:

- **Thresholds are absolute, never rank-normalized.** Scoring relative to the
  day's cross-section always produces a top item, which makes a quiet day
  mathematically impossible. Attention compares a situation to its own
  history, and a day where nothing crosses the threshold produces nothing.
- **Fire-or-silent comes before 0–10.** The v1 engine is a threshold that
  decides whether the email says anything. The 0–10 score grows out of that
  threshold when the Feed needs ranking among multiple firing items.

## Validation and ground truth

“Backtestable” needs a target, and attention has no natural one, so the
target is constructed:

- **Weak labels** come from known event dates — earnings releases, guidance
  changes, major announcements. These are checkable in retrospect and give
  recall targets for free: a missed earnings blowup at high attention is the
  catastrophic failure.
- **Human labels** come from retrospective judgment — “would I have wanted to
  be told about this that day?” — recorded with a timestamp and basis so they
  stay point-in-time honest. At the current universe size this is hours of
  work, not a project.

The metrics are: recall of weak-labeled major events at high attention,
precision at the top band, quiet-day rate versus the baselines (a system that
is never quiet has failed the product's own definition of success), and
stability under small input perturbations.

Future returns may serve as supporting evidence — high-attention items being
followed by elevated realized volatility is a sanity check — but never as the
objective. Optimizing for future returns turns the product into a price
predictor with a different name.

Adjusted bars restate history when splits and dividends land, so derived
observations and signals must have a recompute-on-restatement policy decided
when they are designed, not discovered afterward.

## Replay results — price-only, 2026-09-03

`scripts/replay.ts` sweeps thresholds over the bars already held and reports
what the email would have done. Run it with:

```sh
node --env-file=.env.local scripts/replay.ts
```

It is read-only and needs no secret key: `daily_bars` is anon-readable.

The first run covered 11,025 observations across 25 companies over 441
sessions (2024-11-27 to 2026-09-02), with a 60-session volatility window and
warmup excluded. Benchmark coverage was 100%.

The headline finding is that **an absolute threshold does produce quiet days**,
which is the invariant the whole product rests on and had not previously been
measured. Combining price, relative-performance, and volume anomalies:

| Threshold (sigma, or 4x volume) | Email days | Quiet | Emails/wk | Items/email |
| --- | --- | --- | --- | --- |
| 2.0 | 311/441 | 29.5% | 3.5 | 3.2 |
| 2.5 | 218/441 | 50.6% | 2.5 | 2.5 |
| 3.0 | 165/441 | 62.6% | 1.9 | 2.0 |
| 3.5 | 132/441 | 70.1% | 1.5 | 1.8 |
| 4.0 | 101/441 | 77.1% | 1.1 | 1.8 |
| 5.0 | 86/441 | 80.5% | 1.0 | 1.5 |

Two caveats bound what this shows.

It measures **volume, not correctness**. The other half of the replay — would
the known important situations have made the cut — needs the labeled event set,
which does not exist yet. Nothing here demonstrates recall.

It is **price-only**. News is additive, so whatever threshold ships must leave
room for it; a value already sending 3.5 emails a week has none.

As an artefact check rather than a metric, the largest anomalies land on real
events: ORCL +35.9% (2025-09-10), AMD +23.7% (2025-10-06), AVGO +24.4%
(2024-12-13), and ANET -22.4% on 2025-01-27, the DeepSeek selloff — where ANET
also shows -10.0 sigma against its own cohort, which is the sector-relative
signal separating a company move from a market one.

### Two findings not yet acted on

Both came from sweeps run on 2026-09-03 against the held history. The code that
produced them was exploratory and was not kept; the conclusions were.

**The volume gate is cheap when set high and ruinous when set low.** Swept
against the price threshold rather than independently, a gate at 8x or 10x
costs under a point of quiet-day rate, 4x costs two to seven points, and 3x
caps the quiet-day rate near 64% no matter how high the price threshold goes —
at that point the gate is sending the email and the price threshold is
decorative. The price threshold remains the main lever: with no volume gate at
all, moving from 3.5 to 5 sigma takes quiet from 74.8% to 87.3%.

**A flat OR across the three families misreads a market-wide day.** On
2025-04-09, the tariff-pause rally, the price family fired on 24 of 25 names —
each one genuinely far outside its own normal — and the email would have been a
24-item wall whose honest summary was one sentence: the market went up. The
relative family correctly reported near-zero on almost all of them. The
contrast case is 2025-01-27, where price and relative *disagree*: AI infrastructure
down hard on both, while AAPL, CRM, META and QCOM show strong positive relative
on flat price moves — the rotation, which is exactly the second-order read the
product exists to surface.

The open question is whether an item should qualify on the price family alone
when the relative family says the move was the market's. A market-wide crash
does deserve an email, so the goal is not silence but one item that says the
market moved, rather than 24 that each imply company news. This changes what
the email is, so it is a scope decision rather than a tuning one.

## Deterministic and LLM responsibilities

Deterministic systems own normalization, calculations, anomaly detection,
comparisons, signal strength, relevance, impact calculations where possible,
attention, ranking, objectively measurable direction, and backtesting.

The LLM owns messy-text extraction, classification, entity identification,
evidence extraction, summarisation, and explanation. It must not be the
authority for attention.

“Math decides, LLM explains” is an authority boundary, not a pipeline
position: the LLM participates early in the event path — turning news text
into structured events — but its output there is untrusted input, schema-
validated like any provider payload. Only prose is ever the LLM's final word.

At the current universe size, entity identification is an alias table plus
string matching, not an LLM capability. It becomes a real problem only if the
universe widens.

## Aggregation

Several signals may describe one underlying situation. For example, one
earnings release may generate EPS surprise, revenue surprise, guidance, price,
volume, and analyst-revision signals. These should eventually become one
Intelligence Item rather than unrelated alerts.

The general aggregation problem is hard; the v1 version is not. Grouping
signals by ticker and day covers the overwhelming majority of cases at the
current universe size, and a one-signal Intelligence Item is a valid
degenerate form until Phase 3 makes multi-signal situations real.
