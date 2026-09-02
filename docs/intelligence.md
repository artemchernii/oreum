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
