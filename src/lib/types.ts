/**
 * Shapes mirror the data model in PLAN.md so M4-M6 fill these in rather than
 * rewrite them. Anything the UI needs but the database won't store is derived
 * at render time, not added here.
 */

/** One outlet's version of a story. */
export type Source = {
  outlet: string;
  url: string;
};

/**
 * A metric is only useful next to something to compare it against, so the
 * anchor is required rather than optional.
 */
export type Metric = {
  label: string;
  value: string;
  anchorLabel: string;
  anchorValue: string;
};

/**
 * Company-specific driver. Separate from Metric because metrics compare
 * across companies and exposures do not — "China revenue 21%" means
 * something different for TSM than for META.
 */
export type Exposure = {
  label: string;
  value: string;
  note: string;
  /**
   * Hand-curated from 10-K/10-Q segment data. A stale exposure makes the
   * impact engine confidently wrong, which is worse than no exposure at all,
   * so the review date ships with the value.
   */
  reviewedAt: string;
  sourceNote: string;
};

export type EdgeKind = "customer" | "foundry" | "competitor" | "supplier";

/** A typed connection between two companies. Hand-curated, ~60 rows in M6. */
export type Edge = {
  from: string;
  to: string;
  kind: EdgeKind;
};

/**
 * The hand-curated half of a company: what it is, and the figures that need a
 * human to gather them. Prices are deliberately absent — those live in
 * `daily_bars` and are read through `getQuotes()`. Keeping an invented price
 * on this type is how a mock number ends up on screen months later.
 */
export type Company = {
  symbol: string;
  name: string;
  sectorLine: string;
  metrics: Metric[];
  exposures: Exposure[];
};

/**
 * `direct` — about the company itself.
 * `second_order` — about a neighbour in the graph. This is the product.
 * `macro` — rates, FX, tariffs. Hits everything, differentiates nothing.
 */
export type EventKind = "direct" | "second_order" | "macro";

export type Event = {
  id: string;
  kind: EventKind;
  headline: string;
  /**
   * Our own one-line summary. We store the headline, the links and this —
   * never the article text. That is a licensing boundary, not a technical one.
   */
  summary: string;
  /** Deduplication merges one story across outlets, so this is always a list. */
  sources: Source[];
  publishedAt: string;
  /** 1-3, used for feed ranking in M6. */
  strength: 1 | 2 | 3;
};

export type ImpactDirection = "up" | "down" | "neutral";

/**
 * Event x company. Direction is derived from the edge type, never from how
 * the headline sounds — the market trades expectations, and a wrong signal
 * costs trust that does not come back.
 */
export type EventImpact = {
  eventId: string;
  symbol: string;
  direction: ImpactDirection;
  /** Plain English, one sentence, no jargon. */
  reason: string;
  /** null means the event is about this company directly. */
  viaEdge: Edge | null;
};
