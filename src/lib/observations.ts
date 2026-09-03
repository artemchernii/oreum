/**
 * Observations: the arithmetic layer between finalized bars and attention.
 *
 * Deliberately import-free, for the same reason `price-history.ts` is — these
 * functions are pure maths over numbers, and keeping the Supabase query out of
 * the module is what stops a client component dragging the server client into
 * the browser bundle. The query lives in `quotes.ts`.
 *
 * Nothing here is stored. An observation is a pure function of the bars, and
 * the bars are adjusted, so a split restates history: a stored observation
 * would silently describe prices that no longer exist. Recomputing on demand
 * makes a restatement self-healing by construction, and at 30 symbols over two
 * years the whole universe is a few milliseconds of arithmetic.
 *
 * These produce measurements, not decisions. Whether a measurement deserves
 * attention is a threshold question, and thresholds are absolute — a value is
 * compared to the symbol's own history, never ranked against the day's
 * cross-section, because a ranking always has a winner and would make a quiet
 * day mathematically impossible.
 */

/** One finalized session. Ascending by date. */
export type ObservationBar = {
  date: string;
  close: number;
  volume: number;
};

/** A return, stamped with the session it was realized on. */
export type DailyReturn = {
  date: string;
  change: number;
};

/**
 * Session-over-session returns between the bars actually held.
 *
 * The return is stamped with the *later* date, because that is the session it
 * happened on. Stamping it with the earlier one shifts every observation a
 * session into the past and makes a replay report the move a day early.
 *
 * Gaps are crossed, not filled. A market series is never contiguous — holidays,
 * halts, and a provider that simply missed a day all leave holes — so this
 * compares consecutive *held* bars and never invents a flat session to bridge
 * one. That does mean a return spanning a gap covers more than one day; the
 * alternative, a synthetic 0% session, would dilute the volatility baseline
 * with data that was never observed.
 */
export function dailyReturns(bars: readonly ObservationBar[]): DailyReturn[] {
  const returns: DailyReturn[] = [];

  for (let i = 1; i < bars.length; i += 1) {
    const previous = bars[i - 1].close;
    // A zero previous close is bad data, not a 100% move. Skip it rather than
    // emit an Infinity that would clear every threshold ever set.
    if (previous === 0) continue;

    returns.push({ date: bars[i].date, change: bars[i].close / previous - 1 });
  }

  return returns;
}

/**
 * Sample standard deviation of `changes` — the symbol's own recent volatility.
 *
 * Sample (n-1), not population (n). With the short windows used here the two
 * differ by enough to move a borderline day across a threshold, and the
 * returns are a sample of the symbol's behaviour rather than its entire life.
 *
 * Null when there are fewer than two returns: one observation has no spread,
 * and reporting 0 would make every subsequent move infinitely significant.
 */
export function rollingVolatility(changes: readonly number[]): number | null {
  if (changes.length < 2) return null;

  const mean = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  const squares = changes.reduce((sum, value) => sum + (value - mean) ** 2, 0);

  return Math.sqrt(squares / (changes.length - 1));
}

/**
 * A move expressed in units of the symbol's own volatility.
 *
 * This is what makes the threshold absolute. A 6% day means something very
 * different for a utility than for a small-cap semi, so the raw percentage
 * cannot be compared across the universe — but "three times its own typical
 * daily move" can, and it compares the symbol only to its own past.
 *
 * The sign is kept: direction and attention are separate concepts, and the
 * caller decides using the magnitude.
 *
 * Null when volatility is zero or unknown. A symbol that has not moved offers
 * no scale to measure against, and dividing would fire on every such day.
 */
export function volatilityAdjustedReturn(
  change: number,
  volatility: number | null,
): number | null {
  if (volatility === null || volatility === 0) return null;

  return change / volatility;
}

/**
 * The part of a move that was not the benchmark's.
 *
 * A 3% day when the whole market is up 3% is a market event, not a company
 * one. Null propagates when the benchmark has no bar for that date: treating a
 * missing benchmark as a flat one would convert a data gap into a fabricated
 * relative-performance anomaly.
 */
export function relativeReturn(
  change: number,
  benchmarkChange: number | null,
): number | null {
  if (benchmarkChange === null) return null;

  return change - benchmarkChange;
}

/** The middle value of `values`, averaging the two middles when even. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Today's volume against its own recent baseline.
 *
 * The baseline is the median, not the mean. A mean is dragged upward by the
 * very spikes this is meant to detect — one earnings day in the window raises
 * the bar for the next one — while a median ignores them.
 *
 * Null on an empty or zero baseline rather than Infinity.
 */
export function volumeRatio(
  volume: number,
  baseline: readonly number[],
): number | null {
  const typical = median(baseline);
  if (typical === null || typical === 0) return null;

  return volume / typical;
}

/** Every measurement for one symbol on one session. */
export type Observation = {
  date: string;
  /** The session's return. */
  change: number;
  /** The symbol's own volatility over the preceding window. */
  volatility: number | null;
  /** `change` in units of `volatility` — the price-anomaly measure. */
  volatilityAdjusted: number | null;
  /** The move net of its benchmark, or null if the benchmark has no bar. */
  relative: number | null;
  /** `relative` in units of its own preceding volatility. */
  relativeAdjusted: number | null;
  /** Volume against its own median baseline. */
  volume: number | null;
};

export type ObserveInput = {
  bars: readonly ObservationBar[];
  /** The company's cohort proxy. Omitted for a benchmark observing itself. */
  benchmarkBars?: readonly ObservationBar[];
  /** Sessions of history each measurement is judged against. */
  window: number;
};

/**
 * Every observation derivable from `bars`, warmup excluded.
 *
 * Two rules do the real work here:
 *
 * The baseline for a session is the window *strictly before* it. Including
 * today's return in its own denominator inflates the scale on exactly the days
 * that matter, damping every genuine spike toward the threshold it should have
 * cleared.
 *
 * The benchmark is aligned by date, never by position. A company and its
 * benchmark can hold different session sets, and zipping by index would
 * compare Tuesday's company move to Monday's market move and then attribute
 * the offset to the company.
 */
export function observe({
  bars,
  benchmarkBars,
  window,
}: ObserveInput): Observation[] {
  const returns = dailyReturns(bars);
  const benchmarkByDate = new Map(
    dailyReturns(benchmarkBars ?? []).map((entry) => [entry.date, entry.change]),
  );

  // Volume is looked up by date too: `returns` drops the first bar and may
  // skip a bad one, so its indices do not line up with `bars`.
  const volumeByDate = new Map(bars.map((bar) => [bar.date, bar.volume]));

  const relatives = returns.map((entry) =>
    relativeReturn(entry.change, benchmarkByDate.get(entry.date) ?? null),
  );

  const observations: Observation[] = [];

  for (let i = 0; i < returns.length; i += 1) {
    // Warmup. A measurement judged against less than a full window is judged
    // against a baseline that has not stabilized, so it is not emitted at all
    // rather than emitted with a caveat nobody downstream would honour.
    if (i < window) continue;

    const { date, change } = returns[i];
    const priorChanges = returns.slice(i - window, i).map((entry) => entry.change);
    const volatility = rollingVolatility(priorChanges);

    // The relative baseline needs a complete window: a benchmark gap inside it
    // would otherwise silently shrink the sample the scale is built from.
    const priorRelatives = relatives.slice(i - window, i);
    const relativeVolatility = priorRelatives.every((value) => value !== null)
      ? rollingVolatility(priorRelatives as number[])
      : null;

    const relative = relatives[i];
    const priorVolumes = returns
      .slice(i - window, i)
      .map((entry) => volumeByDate.get(entry.date))
      .filter((value): value is number => value !== undefined);

    observations.push({
      date,
      change,
      volatility,
      volatilityAdjusted: volatilityAdjustedReturn(change, volatility),
      relative,
      relativeAdjusted:
        relative === null
          ? null
          : volatilityAdjustedReturn(relative, relativeVolatility),
      volume: volumeRatio(volumeByDate.get(date) ?? 0, priorVolumes),
    });
  }

  return observations;
}
