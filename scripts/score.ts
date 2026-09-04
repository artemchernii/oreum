/**
 * Score candidate attention rules against the labels.
 *
 * The replay answers "how often". This answers "on the right days", which is
 * the half that decides which row of the threshold table ships.
 *
 * It reports two things per rule that must be read together: the volume
 * numbers, which need no labels, and the accuracy numbers, which are only as
 * good as the labeling behind them. A rule with perfect recall over eleven
 * labeled rows has not been shown to work.
 *
 *   node --env-file=.env.local scripts/score.ts
 */
import { readFileSync } from "node:fs";
import { loadMarket, mag, type ObservedRow } from "./data.ts";
import { evaluate, parsePool, type Judged, type Verdict } from "../src/lib/evaluation.ts";

const PATH = "eval/labels.tsv";

/** The volume gate the replay found cheap at this height and ruinous below it. */
const VOLUME_GATE = 4;
const SIGMA_THRESHOLDS = [2, 2.5, 3, 3.5, 4, 5];

/**
 * Swept to bracket roughly the same quiet-day range as the sigma sweep — see
 * the printed quiet column and adjust these if the two tables stop lining up.
 */
const PCT_THRESHOLDS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.1];

type Rule = { label: string; fires: (row: ObservedRow) => boolean };

/** Where a rule reads its price and relative magnitude from. */
type Magnitudes = {
  price: (row: ObservedRow) => number | null;
  relative: (row: ObservedRow) => number | null;
};

/** The premise the engine rests on: raw percentage cannot be compared across
 * symbols, so every threshold is expressed in units of the symbol's own
 * volatility instead. */
const SIGMA: Magnitudes = {
  price: (row) => row.volatilityAdjusted,
  relative: (row) => row.relativeAdjusted,
};

/**
 * The premise under test. 133 labeled rows showed no overlap between the
 * largest `no` (4.18%) and the smallest `major` (7.84%) by raw move, while the
 * same two rows cross by sigma (2.96 vs 2.48). If a plain percentage rule
 * scores comparably to the sigma rule at matched quiet, the volatility
 * adjustment is buying less than the design assumes.
 */
const RAW_PERCENT: Magnitudes = {
  price: (row) => row.change,
  relative: (row) => row.relative,
};

/**
 * The two rules the market-wide-day decision is between, parameterised over
 * what "big" means so the sigma and raw-percentage sweeps share one
 * implementation rather than risk silently diverging.
 *
 * `flat OR` is what the first replay swept: price, relative, or volume, with
 * no regard for what the symbol is. On 2025-04-09 it fired on 24 of 25 names
 * and the email would have been a wall whose honest summary was one sentence.
 *
 * `benchmark` is the shape that was chosen instead: a benchmark speaks for
 * itself on the price family, and a company has to beat its own cohort. A
 * market-wide day becomes one item about SPY; a sector-wide day becomes one
 * about the cohort proxy. This scoring is what turns that from a preference
 * into a measurement.
 */
function rules(threshold: number, magnitudes: Magnitudes, label: string): Rule[] {
  return [
    {
      label: `flat OR ${label} >= ${threshold}`,
      fires: (row) =>
        mag(magnitudes.price(row)) >= threshold ||
        mag(magnitudes.relative(row)) >= threshold ||
        (row.volume ?? 0) >= VOLUME_GATE,
    },
    {
      label: `benchmark ${label} >= ${threshold}`,
      fires: (row) =>
        row.kind === "benchmark"
          ? mag(magnitudes.price(row)) >= threshold
          : mag(magnitudes.relative(row)) >= threshold || (row.volume ?? 0) >= VOLUME_GATE,
    },
  ];
}

const market = await loadMarket();

let labels = new Map<string, { verdict: Verdict }>();
try {
  labels = new Map(
    parsePool(readFileSync(PATH, "utf8")).map((row) => [`${row.date}|${row.symbol}`, row]),
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  console.log(`no ${PATH} yet — run scripts/pool.ts first. Volume numbers only.\n`);
}

const judged = [...labels.values()].filter((row) => row.verdict !== "").length;
console.log(
  `labels: ${judged} judged of ${labels.size} pooled ` +
    `(${market.rows.length} observations, ${market.sessions.length} sessions)\n`,
);

function pct(value: number | null): string {
  return value === null ? "   n/a" : `${(value * 100).toFixed(1).padStart(5)}%`;
}

function report(rule: Rule) {
  const firing = market.rows.filter(rule.fires);
  const days = new Set(firing.map((row) => row.date));
  const quiet = (market.sessions.length - days.size) / market.sessions.length;

  const scored: Judged[] = market.rows
    .map((row) => {
      const label = labels.get(`${row.date}|${row.symbol}`);
      return label ? { verdict: label.verdict, fired: rule.fires(row) } : null;
    })
    .filter((row): row is Judged => row !== null);

  const result = evaluate(scored);

  console.log(
    `${rule.label.padEnd(24)} ` +
      `${String(days.size).padStart(5)}/${market.sessions.length}  ` +
      `${pct(quiet)}  ` +
      `${(days.size === 0 ? 0 : firing.length / days.size).toFixed(1).padStart(11)}  ` +
      `${pct(result.recall)}  ${pct(result.precision)}  ${pct(result.majorRecall)}`,
  );
}

const header =
  "rule                        email days    quiet  items/email     recall  precision  major";

console.log("── volatility-adjusted (the premise the engine rests on) ──");
console.log(header);
for (const threshold of SIGMA_THRESHOLDS) {
  for (const rule of rules(threshold, SIGMA, "σ")) report(rule);
}

console.log(
  "\n── raw percentage, for comparison (the premise 133 labels put in question) ──",
);
console.log(header);
for (const threshold of PCT_THRESHOLDS) {
  for (const rule of rules(threshold, RAW_PERCENT, "%")) report(rule);
}

console.log(
  `\nAccuracy columns are over ${judged} labeled rows. They mean nothing until ` +
    `that number is large enough to argue with.\n` +
    `Read the two tables at matching quiet-day rates, not matching threshold numbers — ` +
    `a sigma and a percentage are not the same unit.`,
);
