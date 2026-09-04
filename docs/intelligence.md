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

133 rows over 2024-11-27 to 2025-01-28: 66 `yes`, 47 `no`, 20 `major`.

The first 25 rows were judged before `major` was defined and were re-judged
against the same definition as the rest before any of this was scored. Three
moved from `yes` to `major` — DELL 2024-11-27 at -12.25%, CRM 2024-12-04 at
+10.99%, MRVL 2024-12-04 at +23.19% — and two moved from `yes` to `no` once
portfolio membership was removed as a reason.

| Rule | Quiet | Items/email | Recall | Precision | Major recall |
| --- | --- | --- | --- | --- | --- |
| flat OR >= 2.0 | 28.8% | 3.7 | 93.0% | 71.4% | 100.0% |
| benchmark >= 2.0 | 32.7% | 2.8 | 69.8% | 70.6% | 90.0% |
| flat OR >= 2.5 | 49.2% | 2.8 | 70.9% | 84.7% | 95.0% |
| benchmark >= 2.5 | 54.6% | 2.1 | 52.3% | 83.3% | 80.0% |
| flat OR >= 3.0 | 60.3% | 2.2 | 52.3% | 91.8% | 80.0% |
| benchmark >= 3.0 | 66.2% | 1.8 | 43.0% | 90.2% | 70.0% |

Nothing here is decided. Twenty majors is enough to raise a question and not
enough to settle one.

### Both findings survived the re-judging

This is the point of having redone the block: a consistent `major` could have
dissolved either finding, and neither moved.

**The benchmark rule still costs major recall.** 80.0% against 95.0% at 2.5
sigma, while buying almost no precision (83.3% against 84.7%). What it buys is
quiet — 54.6% against 49.2%, and 2.1 items an email against 2.8. That is quiet
paid for with recall rather than with noise, which is a worse bargain than the
2025-04-09 item count suggested, and it is the first evidence against the
decision recorded in `docs/decisions.md`.

**Raw percentage still separates the labels where sigma does not.**

| Verdict | Mean move | Mean price sigma |
| --- | --- | --- |
| `no` | 1.90% | 1.13 |
| `yes` | 4.94% | 2.45 |
| `major` | 14.41% | 5.04 |

The largest `no` is a 4.18% move and the smallest `major` is 7.84% — no
overlap. By sigma they still cross: 2.96 against 2.48. The re-judging widened
the gap in means rather than closing it.

Three explanations remain live and none has been ruled out:

- The universe is 25 tech companies with correlated volatility, so raw
  percentage and sigma are far more alike here than they would be across a
  diverse universe.
- The labeled range is semiconductor-heavy, and a 10% move in those names is
  only about 3 sigma.
- `scripts/label.ts` prints the raw move on the first line, above both sigmas,
  and the re-judged reasons lean on the tool's own vocabulary ("mild stats",
  "rare move against sector"). A presentation effect is not ruled out and may
  have strengthened.

The next step is to score a raw-percentage rule beside the sigma rules rather
than argue about it. If a flat "move exceeds N%" scores comparably at equal
quiet, the volatility adjustment is buying less than assumed.

### Raw percentage scored against sigma, matched on quiet-day rate

`scripts/score.ts` now sweeps a raw-percentage rule alongside the
volatility-adjusted one — same two shapes, `flat OR` and `benchmark`, with
`|change|` and unadjusted `relative` in place of the sigma columns. Run it with
`node --env-file=.env.local scripts/score.ts`; the tables print separately and
are meant to be read at matching quiet rates, not matching thresholds — a
sigma and a percentage are not the same unit. A third table, the conjunction
below, was added afterwards.

At quiet rates that land within a point of each other:

| Shape | Quiet | Recall | Precision | Major recall |
| --- | --- | --- | --- | --- |
| flat OR, sigma >= 2.5 | 49.2% | 70.9% | 84.7% | 95.0% |
| flat OR, pct >= 7% | 49.2% | 36.0% | 96.9% | 100.0% |
| benchmark, sigma >= 3.0 | 66.2% | 43.0% | 90.2% | 70.0% |
| benchmark, pct >= 7% | 65.5% | 29.1% | 96.2% | 90.0% |
| benchmark, sigma >= 2.5 | 54.6% | 52.3% | 83.3% | 80.0% |
| benchmark, pct >= 6% | 55.6% | 32.6% | 90.3% | 90.0% |

The result is not the clean win either direction expected. At the same
quiet-day rate, raw percentage beats sigma on precision and on major recall in
every matched pair, sometimes by a lot — 90% vs 70% majors caught in the
closest benchmark comparison. It loses badly on plain recall — roughly half.

The reading that fits both halves: a flat percentage is a better filter for
"this is big enough to matter regardless of the stock", which is what `major`
actually measures. Sigma is catching a wider set of `yes` rows that a raw
threshold discards outright — a modest move in a stock that rarely moves,
which is exactly the case the volatility adjustment exists to represent as
significant. The 133-row finding that raw percentage separates the verdicts
better than sigma held for the extremes; it does not mean sigma is measuring
nothing.

This does not resolve the open question, and should not be read as license to
drop volatility adjustment. It narrows it: the candidate worth testing next is
not "percentage instead of sigma" but a rule that requires *both* — a move
large in absolute terms and unusual for the symbol — since flat OR and
benchmark are already ceilings and floors on each family alone. The three
caveats from the single-metric finding still apply here: 25 correlated tech
names, a semiconductor-heavy labeled stretch, and `scripts/label.ts` printing
the raw move above both sigmas.

### Both at once — the conjunction, scored 2026-09-04

The candidate the previous section named has been swept: a rule that fires
only when a move is **both** large in absolute terms **and** unusual for the
symbol. `scripts/score.ts` now prints a third table over a grid of
percentage/sigma pairs, and the rule shapes moved out of the script into
`src/lib/attention.ts` with unit tests — the rule that wins the evaluation is
the rule the email has to apply, and a threshold defined inside a script can
only be re-typed somewhere else.

The two existing tables print the same numbers as before the extraction; only
the percentage labels changed, from `% >= 0.05` to `% >= 5`, which is what
that column always meant.

Matched on quiet-day rate, `flat OR` shape:

| Size | Quiet | Recall | Precision | Major recall |
| --- | --- | --- | --- | --- |
| sigma >= 2.5 | 49.1% | 70.9% | 84.7% | 95.0% |
| pct >= 7% | 49.1% | 36.0% | 96.9% | 100.0% |
| **4% and 2.5 sigma** | **52.3%** | **66.3%** | **91.9%** | **95.0%** |
| sigma >= 3 | 60.2% | 52.3% | 91.8% | 80.0% |

Read down that table: the conjunction reaches the precision of the 3 sigma
rule (91.9% against 91.8%) while keeping the recall of the 2.5 sigma rule
(66.3% against 70.9%) and its major recall (95%). Sigma alone can buy that
precision, but only by climbing to 3 sigma, and by then it has given up 14
points of recall and 15 of major recall. The percentage rule alone buys more
precision still and pays for it with half the recall.

The same holds a step lower, where the comparison is against the percentage
rule rather than the sigma one:

| Size | Quiet | Recall | Precision | Major recall |
| --- | --- | --- | --- | --- |
| pct >= 4% | 14.5% | 84.9% | 85.9% | 100.0% |
| **4% and 2 sigma** | **38.0%** | **79.1%** | **86.1%** | **100.0%** |
| sigma >= 2 | 28.7% | 93.0% | 71.4% | 100.0% |

Adding the sigma floor to a 4% rule more than doubles the quiet-day rate,
from 14.5% to 38.0%, at a cost of 5.8 points of recall and no cost at all to
precision or major recall. Adding the percentage floor to a 2 sigma rule buys
15 points of precision for 14 of recall.

So the reading from the single-metric comparison survives contact with the
conjunction: the two measures are catching different things, and requiring
both is not a compromise between them. Nothing in the 50-row sweep beats
`flat OR`, 4% and 2.5 sigma on all four of quiet, recall, precision and major
recall at once. That is weaker evidence than it sounds — 32 of the 50 rows are
un-beaten in four dimensions, because four axes leave almost everything
un-comparable — which is why the comparison that decides anything is the one
at matched quiet above, not a frontier count.

Three things qualify it:

- **A 2% floor is inside the noise.** At `% >= 2 & σ >= 2.5` the conjunction
  is indistinguishable from sigma alone — one email day in 442 separates them.
  Essentially every 2.5 sigma move in this universe already clears 2%, so the
  percentage floor does nothing until 3–4%. That is a fact about 25 tech
  names, not about the method.
- **The benchmark shape still costs major recall**, at every size. It reads
  90%, 80%, 70% down the conjunction table exactly as it did down the other
  two, so the shape question is independent of the size question. The sweep
  adds one thing to it: every conjunction row that some other rule beats on
  all four axes is a `benchmark` row, and what beats it is a plain `flat OR`
  sigma rule. No `flat OR` conjunction row is beaten by anything.
- **Still 133 labels.** 20 of them are `major`, so a single missed row moves
  major recall by five points, and the labeled stretch is semiconductor-heavy.
  Nothing here is a threshold decision; it is the first candidate worth
  labeling against.

The leading candidate for the email is therefore `flat OR`, 4% and 2.5 sigma:
52.3% quiet, 2.7 items on a day that fires, 91.9% precision. That is about two
and a half emails a week with under three items each — inside what Phase 1
asks for. It should not be written into `docs/decisions.md` until the labels
reach a point where 20 majors is not the whole denominator.

### Reported recall is an upper bound

Recall is measured over labeled rows, and 88% of labeled rows came from the
fired set. The control sample is the only out-of-pool evidence: 14 judged, one
returned `yes` — SOXX on 2024-12-11, an ETF up 2.5% that nothing flagged.

One in fourteen is not a rate worth quoting, but it is not zero, and it points
somewhere specific: benchmarks are far less volatile than the companies, so a 2
sigma pool threshold shared between them may be too high for an index. A market
day that matters can look small in sigma terms.

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
