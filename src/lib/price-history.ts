/**
 * The chart's windowing and scale maths.
 *
 * Deliberately import-free. The chart is a client component, so anything it
 * needs must not reach a server module: when these lived beside the Supabase
 * query, `next build` pulled the server client into the browser bundle and
 * failed. The query is `getPriceHistory()` in `quotes.ts`.
 *
 * Pure functions, so the arithmetic most likely to be quietly wrong — window
 * cutoffs, a degenerate scale, a percentage — is tested without a database.
 */

/** One session's close. Ascending by date: the order the chart draws. */
export type HistoryBar = {
  date: string;
  close: number;
};

/**
 * The offered windows, in calendar days.
 *
 * There is no 1D or 5D. A day's shape needs intraday bars, which this tier
 * does not sell and Phase 2 has not bought yet — a "1D" button over daily
 * closes would draw one point and call it a session. There is no 5Y either:
 * Basic retains about two years, so the button could never fill.
 */
export const RANGES = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
} as const;

export type Range = keyof typeof RANGES;

export const DEFAULT_RANGE: Range = "6M";

/**
 * The bars inside `range`, measured back from the newest bar held.
 *
 * Anchored on the data rather than on `new Date()`. A healthy cache is
 * routinely three days behind — Friday's close is the newest data all weekend
 * and the current session is never served — so anchoring on today would
 * quietly return less than the label promises, and would return nothing at all
 * for a symbol whose ingestion stalled.
 */
export function sliceRange(
  bars: readonly HistoryBar[],
  range: Range,
): HistoryBar[] {
  const newest = bars.at(-1);
  if (!newest) return [];

  // Calendar arithmetic in UTC. A trade date is a calendar date, not an
  // instant, and `setUTCDate` handles month and year rollover — the thing
  // hand-rolled month maths gets wrong.
  const cutoff = new Date(`${newest.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RANGES[range]);
  const floor = cutoff.toISOString().slice(0, 10);

  // Inclusive: a bar landing exactly on the cutoff belongs to the window.
  return bars.filter((bar) => bar.date >= floor);
}

/** Padding as a share of the visible range, so a small move stays visible. */
const PAD_RATIO = 0.08;

/**
 * The y-axis domain for `closes`, padded so the line clears the frame.
 *
 * The pad is a share of the *range*, never of the price: a $500 stock moving
 * $2 would lose its move entirely inside a percentage-of-price pad. A flat or
 * single-value series has no range to take a share of, so it gets a band
 * derived from the value itself — without that the scale is degenerate and
 * the line is drawn on the frame edge or not at all.
 */
export function priceDomain(closes: readonly number[]): [number, number] {
  if (closes.length === 0) return [0, 1];

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const spread = max - min;

  // `|| 1` covers a zero value, whose own fraction is also zero.
  const pad = spread > 0 ? spread * PAD_RATIO : Math.abs(max) * 0.02 || 1;

  // A padded floor below zero would imply a negative price.
  return [Math.max(0, min - pad), max + pad];
}

export type Direction = "up" | "down" | "flat";

export type WindowChange = {
  absolute: number;
  percent: number;
  direction: Direction;
};

/**
 * Movement across the whole window: first close to last.
 *
 * Null on fewer than two bars, matching `buildQuote` — one bar means the move
 * is unknown, and 0.00% would claim "unchanged". `flat` is a third answer for
 * the same reason: an unchanged window is not an up one.
 *
 * Makes no assumption that the series is contiguous. A gap from a holiday or a
 * missed run is a real move over real time, just not a daily one.
 */
export function windowChange(
  bars: readonly HistoryBar[],
): WindowChange | null {
  const first = bars[0];
  const last = bars.at(-1);
  if (!first || !last || bars.length < 2) return null;

  const absolute = last.close - first.close;

  return {
    absolute,
    percent: (absolute / first.close) * 100,
    direction: absolute > 0 ? "up" : absolute < 0 ? "down" : "flat",
  };
}

/**
 * The ranges worth offering for `bars`.
 *
 * A range is offered when the history spans at least its length, plus the
 * next one up so there is always a button that shows everything held. The
 * point is not tidiness: a 1Y button over six weeks of data draws a short
 * line across a year-wide frame, which reads as "the rest is missing" rather
 * than "the rest was never fetched".
 */
export function availableRanges(bars: readonly HistoryBar[]): Range[] {
  const first = bars[0];
  const last = bars.at(-1);
  if (!first || !last) return [];

  const spanDays =
    (Date.parse(`${last.date}T00:00:00Z`) -
      Date.parse(`${first.date}T00:00:00Z`)) /
    86_400_000;

  const names = Object.keys(RANGES) as Range[];
  const filled = names.filter((name) => RANGES[name] <= spanDays);

  // The first unfilled range is the "everything we hold" view. With no filled
  // ranges at all that is the shortest button, which is still true — it just
  // shows less than a month.
  const next = names[filled.length];
  return next ? [...filled, next] : filled;
}
