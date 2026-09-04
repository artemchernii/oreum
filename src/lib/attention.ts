/**
 * Attention rules: the shapes a threshold can take.
 *
 * The measurement layer is `observations.ts` and the scoring layer is
 * `evaluation.ts`. This is the piece between them — what it means for a
 * session to be loud enough to say something about — and it is deliberately a
 * separate module because the rule that wins the Phase 1 evaluation is the
 * same rule the email has to apply. A rule defined inside a script can only
 * ever be re-typed somewhere else, and two copies of a threshold are two
 * thresholds.
 *
 * Import-free and pure, like the two modules it sits between: values in,
 * true or false out. It decides nothing on its own — which size and which
 * shape ship is what `scripts/score.ts` measures and `docs/intelligence.md`
 * records.
 *
 * Two ideas are kept apart on purpose. A *size* says what counts as big, on
 * each of the two price families. A *shape* says which families a row is
 * allowed to be loud on, given what the symbol is. Sweeping a size against a
 * fixed pair of shapes is what makes "percentage or sigma" a measurement
 * rather than an argument.
 */

/**
 * The subset of an observation a rule reads.
 *
 * Structural rather than an import of `Observation`, so a pool row read back
 * from `eval/labels.tsv` and a freshly computed observation can both be
 * judged by the same rule without either module knowing about the other.
 */
export type Measured = {
  kind: "company" | "benchmark";
  /** The session's return, unadjusted. */
  change: number;
  /** `change` in units of the symbol's own volatility. */
  volatilityAdjusted: number | null;
  /** The move net of its cohort proxy, unadjusted. */
  relative: number | null;
  /** `relative` in units of its own volatility. */
  relativeAdjusted: number | null;
  /** Volume against its own median baseline. */
  volume: number | null;
};

/**
 * Magnitude, with a missing measurement reading as "did not fire".
 *
 * Null means the measurement could not be taken — no benchmark bar, not
 * enough history. Reading it as zero keeps a gap silent; the alternative,
 * treating unknown as loud, would fire the email on missing data.
 */
export function mag(value: number | null): number {
  return value === null ? 0 : Math.abs(value);
}

/** The volume gate the replay found cheap at this height and ruinous below it. */
export const VOLUME_GATE = 4;

/**
 * What counts as big, asked separately of the price family and the relative
 * family. Both are questions about the same row, because a conjunction needs
 * to read two measurements of one move and a threshold number alone cannot
 * carry that.
 */
export type Size = {
  label: string;
  price: (row: Measured) => boolean;
  relative: (row: Measured) => boolean;
};

/** A named rule, ready to be swept. */
export type Rule = { label: string; fires: (row: Measured) => boolean };

/** `0.025` as `2.5`, so a threshold in percent reads as one. */
function asPercent(fraction: number): string {
  return String(Number((fraction * 100).toFixed(2)));
}

/**
 * Unusual for this symbol.
 *
 * The premise the engine rests on: a raw percentage cannot be compared across
 * symbols, so a move is measured in units of the symbol's own volatility.
 */
export function sigma(threshold: number): Size {
  return {
    label: `σ >= ${threshold}`,
    price: (row) => mag(row.volatilityAdjusted) >= threshold,
    relative: (row) => mag(row.relativeAdjusted) >= threshold,
  };
}

/**
 * Big in absolute terms, whatever the symbol is.
 *
 * The premise under test. If a flat "the move exceeds N%" scores comparably to
 * the sigma rule at a matched quiet-day rate, the volatility adjustment is
 * buying less than the design assumes.
 */
export function percent(threshold: number): Size {
  return {
    label: `% >= ${asPercent(threshold)}`,
    price: (row) => mag(row.change) >= threshold,
    relative: (row) => mag(row.relative) >= threshold,
  };
}

/**
 * Both at once: large in absolute terms *and* unusual for the symbol.
 *
 * Scoring the first two against each other did not produce a winner. At
 * matched quiet, percentage took precision and major recall while sigma took
 * roughly twice the plain recall — which reads as two filters catching
 * different things rather than one being better. A conjunction is the rule
 * that follows from that reading: it should keep the precision a percentage
 * floor buys and drop the modest-move-in-a-quiet-name rows that only sigma
 * likes. Whether it also keeps enough recall to be worth shipping is what the
 * sweep is for.
 */
export function both(percentThreshold: number, sigmaThreshold: number): Size {
  const size = percent(percentThreshold);
  const unusual = sigma(sigmaThreshold);

  return {
    label: `${size.label} & ${unusual.label}`,
    price: (row) => size.price(row) && unusual.price(row),
    relative: (row) => size.relative(row) && unusual.relative(row),
  };
}

/**
 * Price, cohort, or volume — with no regard for what the symbol is.
 *
 * What the first replay swept. On 2025-04-09 it fired on 24 of 25 names and
 * the email would have been a wall whose honest summary was one sentence. It
 * stays in the sweep as the ceiling on recall: nothing catches more.
 */
export function flatOr(size: Size): Rule {
  return {
    label: `flat OR ${size.label}`,
    fires: (row) => size.price(row) || size.relative(row) || (row.volume ?? 0) >= VOLUME_GATE,
  };
}

/**
 * A benchmark speaks for itself; a company has to beat its cohort.
 *
 * The shape chosen in `docs/decisions.md`. A market-wide day becomes one item
 * about SPY and a sector-wide day one item about the cohort proxy, instead of
 * twenty-five items that each imply company news.
 *
 * A benchmark is judged on price alone — it has no cohort to be measured
 * against, and an index whose volume is heavy without its price moving is a
 * fact about trading rather than about the market.
 */
export function benchmarkFirst(size: Size): Rule {
  return {
    label: `benchmark ${size.label}`,
    fires: (row) =>
      row.kind === "benchmark"
        ? size.price(row)
        : size.relative(row) || (row.volume ?? 0) >= VOLUME_GATE,
  };
}

/** Both shapes at one size, in the order the tables print them. */
export function shapes(size: Size): Rule[] {
  return [flatOr(size), benchmarkFirst(size)];
}
