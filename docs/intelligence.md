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

This is now settled. An item does **not** qualify on the price family alone.
A benchmark is an observable entity in its own right — it already has a
`companies` row and daily bars — so a market-wide day produces one item about
SPY, and a sector-wide day one about the cohort proxy. A company qualifies only
on the relative or volume family: it has to beat its own cohort to speak.

Measured over the held history at 3.5 sigma with a 4x volume gate:

| Day | Flat OR | Benchmark rule |
| --- | --- | --- |
| 2025-04-09, tariff-pause rally | 29 items | 5 items, all benchmarks (SPY 7.5 sigma) |
| 2025-01-27, DeepSeek | 14 items | 12 items — the rotation survives |

On 2025-04-09 no company qualifies, which is the intended result: none of them
beat its cohort, and the honest email is that the market moved. On 2025-01-27
the rotation is untouched — ANET -10.0, ORCL -7.6 and NVDA -4.4 relative
against AAPL +6.4, QCOM +5.7 and META +4.7 — which is exactly the second-order
read the product exists to surface.

One consequence is not yet handled: five benchmarks fired on 2025-04-09 (SPY,
QQQ, XLK, SOXX, IGV), all saying the same thing. The email needs a rule for
which benchmark speaks for a market-wide day, or it trades a wall of 24 for a
huddle of five.

## The labeled evaluation set

The replay measures how often the email fires. It cannot measure whether it
fires on the right days, and no amount of sweeping will tell it — attention has
no natural target, so the target is built by hand.

`scripts/pool.ts` writes `eval/labels.tsv`; `scripts/score.ts` reads it back
and scores candidate rules against it. Both are read-only against the database
and need no secret key:

```sh
node --env-file=.env.local scripts/pool.ts
node --env-file=.env.local scripts/score.ts
```

The first pool holds 1,406 rows over 359 sessions: 1,256 that fired at the
loosest thresholds any candidate rule may use (2 sigma on price or relative,
3x on volume) and a 150-row control sample of sessions nothing fired on. 215
of the rows are benchmarks, which the chosen rule needs in order to be scored
at all.

The pool is drawn loose on purpose. Every stricter rule's output is a subset of
it, so one labeling pass scores every rule and the labels do not have to be
redone when a threshold moves.

### Reading the numbers

Every measurement in the pool answers one question: **how usual or unusual is
this, for this particular stock?** None of them says whether something is good
or bad.

| Column | What it is |
| --- | --- |
| `change` | the day's price move. `0.0552` is +5.52% |
| `price_sigma` | that move divided by how much this stock normally moves in a day |
| `cohort_sigma` | the same, after subtracting what its cohort proxy ETF did |
| `volume` | shares traded divided by its own median. `1.0` is typical |

`price_sigma` exists because raw percentages cannot be compared between
symbols. A 0.6% day is nothing for TSM, whose normal day is about 2.5%, and
would be remarkable for something that normally moves 0.2%. Dividing by the
symbol's own history is what makes one absolute threshold work across the
whole universe.

`cohort_sigma` separates the company from the market. A stock that fell
because everything fell is not company news, and the two numbers together say
which happened.

`volume` is a multiple, not a sigma. It is never negative.

Rough scale for both sigma columns, ignoring sign:

| Magnitude | How often | Read as |
| --- | --- | --- |
| under 1 | most days | noise |
| 1–2 | a few times a month | mild |
| 2–3 | monthly-ish | notable |
| 3–4 | a few times a year | unusual, usually a reason behind it |
| 4–6 | yearly-ish | something happened |
| 6+ | rare | big |

And for volume: under 1 is quiet, 1.5–2 is busy, 3+ is a crowd, 5+ is
everyone.

### The two numbers together

Three GOOGL sessions from December 2024 show why both sigmas exist:

| Date | `price_sigma` | `cohort_sigma` | Reading |
| --- | --- | --- | --- |
| 2024-12-10 | 3.92 | 4.67 | cohort is larger — the sector did not move and GOOGL did. Company news. |
| 2024-12-11 | 3.48 | 2.34 | still mostly GOOGL, but tech rose with it. Partly carried. |
| 2024-12-18 | -2.00 | -0.20 | cohort near zero — GOOGL fell only because everything fell. |

The last row is the case the whole product turns on. A 2-sigma drop looks
alarming on its own and means nothing once the market is subtracted. Emailing
about it would be exactly the noise Oreum exists to remove, which is why a
company must clear the relative family rather than the price family to
produce an item.

### Direction is not attention

The sign says which way, never how much it matters. A -6 sigma deserves the
same attention as a +6 sigma: something large happened. When labeling, judge
the magnitude and let the sign describe it.

### How to label

Run the prompt. It asks one row at a time and writes the file itself:

```sh
node scripts/label.ts
```

Type the verdict then the reason in plain words — `y big earnings move`. `s`
skips a row, `q` saves and quits. Every judgment is written immediately, so a
closed terminal costs at most the row being typed.

To change your mind about rows already judged, pass a symbol or a date:

```sh
node scripts/label.ts MRVL
node scripts/label.ts 2024-12-04
```

Do not edit `eval/labels.tsv` by hand. It is tab-separated, editors write
spaces that look identical, and the first attempt broke fourteen of twenty
rows that way.

| Verdict | Means |
| --- | --- |
| `no` | I would not have wanted to be told. |
| `yes` | Worth a line in that day's email. |
| `major` | If the email had been silent, the product failed. |

You do not have to know what happened. "Big move on heavy volume, mostly
company-specific" is a good reason. The question is whether you would have
wanted the email, not whether you can explain the cause.

Most rows are `no`, and long runs of them are the expected result rather than
a sign of doing it wrong.

### What makes something major

`yes` and `major` are not big and bigger. They answer different questions.

`yes` asks whether the item earned its place in the email. `major` asks
whether **its absence would have been a failure** — the day someone says "did
you see what happened to MRVL?" and the honest answer is that the product said
nothing.

Useful tests, none of them numeric:

- Would I have been annoyed to learn about this a week later?
- Would it have changed what I looked at that day?
- Is this the kind of thing a person would mention unprompted?

Expect roughly one in twenty to thirty rows. If nothing is ever `major`, the
metric that matters most has no denominator; if everything is, it measures
nothing.

**Do not derive `major` from the sigma columns.** A label that means
"price_sigma above 5" turns the evaluation into a check that one threshold
agrees with another. Judge the situation, then let the numbers be scored
against your judgment — that is the only order in which the result means
anything.

### Reading the score

`recall` is the share of wanted days the rule caught. `precision` is the share
of what it sent that was wanted. `major` is recall restricted to `major`, and
it is the number a release should be read on.

Unlabeled rows are excluded from all three. An unlabeled row is not a negative;
counting it as one would make precision fall every time the pool grows.

None of these numbers mean anything until enough rows are judged to argue with,
and `scripts/score.ts` prints the count next to them so that stays visible.

### The honesty constraint

Labels are point-in-time. The failure mode is re-labeling a day after seeing
how a threshold scored on it, which turns the evaluation set into a mirror.
The file is git-tracked and every label carries a date precisely so that a
changed judgment shows up in review instead of disappearing into a metric.

## First scored labels — 133 rows, 2026-09-04

The first block of labels covers 2024-11-27 to 2025-01-28: 71 `yes`, 45 `no`,
17 `major`. `scripts/score.ts` against them:

| Rule | Quiet | Items/email | Recall | Precision | Major recall |
| --- | --- | --- | --- | --- | --- |
| flat OR >= 2.0 | 28.8% | 3.7 | 93.2% | 73.2% | 100.0% |
| benchmark >= 2.0 | 32.7% | 2.8 | 68.2% | 70.6% | 88.2% |
| flat OR >= 2.5 | 49.2% | 2.8 | 69.3% | 84.7% | 94.1% |
| benchmark >= 2.5 | 54.6% | 2.1 | 51.1% | 83.3% | 76.5% |
| flat OR >= 3.0 | 60.3% | 2.2 | 51.1% | 91.8% | 76.5% |
| benchmark >= 3.0 | 66.2% | 1.8 | 42.0% | 90.2% | 64.7% |

Nothing here is decided. 133 rows and 17 majors is enough to raise questions
and not enough to settle them.

### The benchmark rule costs major recall

This is the first evidence against the decision recorded above. Requiring a
company to clear the relative family drops major events that were large in
price but partly sector-wide — and it buys almost no precision doing it
(83.3% against 84.7% at 2.5 sigma). What it does buy is quiet: 54.6% against
49.2%, and 2.1 items an email against 2.8.

So the trade is quiet against recall, not quiet against noise. That is a
different and worse bargain than the 2025-04-09 wall suggested, and it needs
more labels before it either overturns the decision or turns out to be an
artefact of seventeen majors.

### Raw percentage separates the labels; sigma does not

Over these 133 rows:

| Verdict | Mean move | Mean price sigma |
| --- | --- | --- |
| `no` | 1.82% | 1.08 |
| `yes` | 5.35% | 2.63 |
| `major` | 14.22% | 4.71 |

Both rise with the verdict, but only one separates cleanly. The largest `no`
was a 4.03% move and the smallest `major` was 7.84% — no overlap at all. By
sigma they cross: the largest `no` is 2.96 and the smallest `major` is 2.48.

This runs against the premise the engine is built on, which is that a
percentage cannot be compared across symbols and its volatility-adjusted form
can. Three reasons to hold it loosely before acting:

- The universe is 25 tech companies with broadly similar volatility, so raw
  percentage and sigma are heavily correlated here in a way they would not be
  across a diverse universe.
- The labeled range is dominated by semiconductor names in a volatile stretch,
  where a 10% move is only about 3 sigma.
- `scripts/label.ts` prints the raw move on the first line, above both sigmas.
  A presentation effect is a live explanation, not a ruled-out one.

The next step is to score a raw-percentage rule alongside the sigma rules
rather than argue about it. If a flat "move exceeds N%" scores comparably at
equal quiet, the volatility adjustment is buying less than assumed.

### Reported recall is an upper bound

Recall is measured over labeled rows, and 88% of labeled rows came from the
fired set. The control sample is the only out-of-pool evidence: 14 judged, and
one of them — SOXX on 2024-12-11, an ETF up 2.5% that nothing flagged — came
back `yes`.

One in fourteen is not a rate worth quoting, but it is not zero, and it points
at something specific: benchmarks are far less volatile than the companies, so
a 2 sigma pool threshold shared between them may be too high for an index. A
market day that matters can look small in sigma terms.

### One known inconsistency in the labels

The first 18 rows were judged before `major` was properly defined, and they use
`yes` where later rows use `major`. MRVL on 2024-12-04 — +23.19%, 9.81 sigma,
6.58x volume — is labeled `yes`, while MRVL on 2024-12-13 at +10.79% and 2.79
sigma is labeled `major`. Those two rows are measuring different definitions
and the first block needs re-judging before the major numbers can be trusted.

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
