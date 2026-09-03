# Architectural decisions

This is the concise decision record for the redesigned product. Historical
implementation decisions remain in git history and the relevant operational
documentation.

| Decision | Rationale |
| --- | --- |
| Oreum is market intelligence, not a news graph | The product must answer what changed, how significant it is, what it affects, and whether the investor should care. |
| Event, signal, impact, relevance, and attention are separate | Each answers a different question and needs different evidence and validation. |
| Math decides; the LLM explains | Attention, ranking, and measurable direction must be reproducible and backtestable. |
| Facts precede interpretation | Preserving actual, expected, previous, and reference values prevents derived meaning from replacing source truth. |
| The graph discovers impact but does not decide attention | Relationship paths explain possible propagation; personal attention requires separate relevance and signal logic. |
| Live market state is separate from historical daily bars | Current prices and intraday volume update on a different clock from finalized historical data. |
| Attention Engine v1 is experimental | Weights must be evaluated against historical situations and simple baselines rather than declared correct in advance. |
| Technical indicators are contextual | RSI and moving averages provide context and are not trading recommendations or automatic attention inputs. |
| Mock intelligence is not production truth | Existing mock events, impacts, edges, metrics, and exposures exist to exercise UI states only. |
| The redesign is merged with the original thesis, not substituted for it | The attention pipeline and vocabulary stay; the original noise-reduction goal and second-order differentiator remain the product rather than being replaced by a generic intelligence platform. |
| The email is the primary surface | The product's job is suppression: one or two emails a day, silent when nothing matters. Feed and Ticker are the investigation surfaces the email points into. |
| The v1 email is end-of-day and needs no live provider | The daily cadence works from finalized bars the pipeline already holds; live data is its own phase gated on an explicit provider and cost decision. |
| The chart is built from cached bars before any live layer | Real OHLCV is already ingested and the pipeline backfills, so the chart needs no new provider. A mocked chart on the investigation surface costs trust at exactly the moment an email drives a visit. |
| Impact direction derives from the relationship type, never sentiment | A customer's capex increase is mechanically a supplier tailwind. Headline tone is noise, and a wrong direction costs trust that does not come back. |
| The universe stays fixed and hand-curated | The dense connections are the asset; one company's capex is another's revenue. Expansion is a Phase 6 roadmap decision, not a filter change. |
| The filtered-out counter is permanent UI | A quiet email is only credible when the product shows what it suppressed. |
| Attention is absolute-thresholded, never rank-normalized | Per-day ranking always produces a top item, which makes the stated success state — a quiet day — mathematically impossible. |
| Attention is validated against labeled situations, not future returns | Known event dates give weak labels; retrospective human judgment gives the rest. Metrics are event recall at high attention, precision at the top, quiet-day rate versus baselines, and stability. Future returns are supporting evidence, never the objective. |
| Consensus estimates are deferred | "Expected" values require licensed estimates data, one of the most expensive data categories. Until justified, the price reaction plus the classified headline carries the story. |
| Benchmark ETFs ride the existing ingestion | The grouped-daily response already contains every US ticker; keeping the benchmark rows unblocks relative performance at near-zero cost. |
| Provider entitlements are probed, not assumed | Live prices and the earnings calendar are 403 on the current plan; news, market status, reference data and financials are not. Recorded in `docs/prices.md` with the date they were tested. |
| Finnhub free is the live-price candidate | Verified real-time, 24-second lag. It has no candles or intraday volume, which no shipped feature needs — daily bars already carry volume. |
| Live volume is deferred, not sourced | Adding a second market-data provider for a feature nothing requires would buy two sources of price truth and a reconciliation problem. |
| Provider ticker tags are not relevance | An article about one company arrives tagged with several. News needs a deterministic relevance filter before an LLM ever sees it — that filter is both the quality control and the cost control. |
| The dogfood kill-gate is restored | If the developer is not reading the daily email after two weeks, the hypothesis has failed and building continues only after a rethink. |
| Benchmarks are `companies` rows, not a second table | `daily_bars` foreign-keys to `companies`, and that FK is what keeps ingestion's filter honest — benchmark bars need the same guarantee. A `kind` column separates them; every product surface filters to `kind = 'company'`. |
| Sector benchmarks are cohort proxies, not index membership | Three sectors have exactly one member, so a peer-average sector-relative return would be permanently zero for AAPL, ANET and DELL. Each company carries its proxy ETF in `benchmark_symbol`: SOXX spans semiconductors and equipment, IGV the software six, XLK stands in for the four one-to-three-member cohorts. QQQ is ingested unreferenced, so calibrating the market benchmark later has history to test against. |
| Sonnet, not Haiku, classifies news | Classification errors compound — a wrong event type propagates a wrong impact direction. Sonnet's edge-case judgment on ambiguous headlines is worth the price difference, which the deterministic pre-filter and the Batch API keep under $2/month anyway. |
| The chart is SVG (shadcn/Recharts), not a canvas library | The token layer defines every colour with `light-dark()`, which CSS resolves and a canvas cannot — a canvas chart would need JS colour values re-read from computed styles on every theme change. Recharts takes `var(--price-up)` straight through, and Phase 5's event markers are `ReferenceDot`s rather than a bespoke overlay. |
| The chart offers no 1D or 5D window, and no 5Y | A day's shape needs intraday bars this tier does not sell, so "1D" over daily closes would draw one point and call it a session. Basic retains about two years, so 5Y could never fill. Offered ranges are also capped to the history actually held. |
| The chart does not animate in | Recharts reveals an area over 1.5s, so first paint is an empty frame. Motion also manufactures attention, which is exactly what this product must not do by decoration. |
| Chart line colour encodes window direction, never attention | `price-up`/`price-down` are the only hued tokens, and they mean observed movement. A flat window is muted rather than green, because unchanged is a third answer. |
| Observations are computed on demand, never stored | Bars are ingested with `adjusted=true`, so a split restates history — a stored observation would keep describing prices that no longer exist, and would need a reconciliation job to notice. Recomputing from the bars makes a restatement self-healing by construction, and the whole universe is milliseconds of arithmetic. Phase 1 therefore adds no migration. |
| A session is judged against the window strictly before it | Including today's return in its own volatility baseline inflates the denominator on exactly the days that matter, damping every genuine spike toward the threshold it should have cleared. The first 60 sessions of every symbol are warmup and emit nothing. |
| The volume baseline is a median, not a mean | A mean is dragged upward by the very spikes the signal exists to detect: one earnings day inside the window raises the bar for the next one. |
| Benchmark returns are aligned by date, never by position | A company and its proxy ETF can hold different session sets. Zipping by index compares one day's company move to another day's market move and then attributes the offset to the company. A missing benchmark bar yields a null relative return, never a synthetic flat one. |
| The threshold is chosen from the replay's quiet-day rate | Thresholds are not set by taste. `scripts/replay.ts` sweeps them over the held history and reports emails per week and the quiet-day rate; the number is picked from that table. The sweep is price-only, so the chosen value must leave headroom for news, which is additive. |
