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
| The chart is built from cached bars before any live layer | Two years of real OHLCV already exist. A mocked chart on the investigation surface costs trust at exactly the moment an email drives a visit. |
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
