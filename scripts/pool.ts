/**
 * Build or refresh the labeling pool.
 *
 * The replay measures how often the email fires. It cannot measure whether it
 * fires on the right days, so the right days have to be written down by hand.
 * This script produces the file that gets written on.
 *
 * Two design rules make the resulting numbers mean anything.
 *
 * The pool is drawn at the *loosest* thresholds any candidate rule might use,
 * so every stricter rule's output is a subset of it. One labeling pass then
 * scores every rule, and the labels do not have to be redone when the rule
 * changes.
 *
 * The pool also carries a control sample of sessions nothing fired on. Without
 * it recall is circular: a day that measured 1.5 sigma and mattered would
 * never appear, so it could never be counted as missed, and every rule would
 * score perfect recall against a pool made of its own output.
 *
 * Existing labels are preserved. Run it as often as the bars change:
 *   node --env-file=.env.local scripts/pool.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { loadMarket, mag, WINDOW, type ObservedRow } from "./data.ts";
import {
  formatPool,
  mergePool,
  parsePool,
  stableSample,
  type Candidate,
  type PoolRow,
} from "../src/lib/evaluation.ts";

const PATH = "eval/labels.tsv";

/**
 * The loosest thresholds any rule under consideration may use. Tightening a
 * rule below these is fine; loosening one past them silently puts candidates
 * outside the pool, where they can never be labeled.
 */
const POOL = { price: 2, relative: 2, volume: 3 };

/** Sessions nothing fired on, judged as a control. Enough to see a miss. */
const CONTROL = 150;

function families(row: ObservedRow): string[] {
  const fired: string[] = [];

  if (mag(row.volatilityAdjusted) >= POOL.price) fired.push("price");
  if (mag(row.relativeAdjusted) >= POOL.relative) fired.push("relative");
  if ((row.volume ?? 0) >= POOL.volume) fired.push("volume");

  return fired;
}

/**
 * Rounded for the human reading the file, not for the maths.
 *
 * Nothing scores off these columns — `scripts/score.ts` recomputes every
 * measurement from the bars and reads only the verdict. Seventeen significant
 * figures in a file somebody labels by hand is noise in the way of the job.
 */
function round(value: number | null, places: number): number | null {
  return value === null ? null : Number(value.toFixed(places));
}

function candidate(row: ObservedRow, reason: string): Candidate {
  return {
    symbol: row.symbol,
    date: row.date,
    kind: row.kind,
    reason,
    change: round(row.change, 4)!,
    volatilityAdjusted: round(row.volatilityAdjusted, 2),
    relativeAdjusted: round(row.relativeAdjusted, 2),
    volume: round(row.volume, 2),
  };
}

const market = await loadMarket();

console.log(
  `universe: ${market.companies} companies, ${market.benchmarks} benchmarks, ` +
    `${market.bars} bars`,
);
console.log(
  `observations: ${market.rows.length} over ${market.sessions.length} sessions ` +
    `(${market.sessions.at(0)} to ${market.sessions.at(-1)}), window ${WINDOW}`,
);

const fired: Candidate[] = [];
const quiet: ObservedRow[] = [];

for (const row of market.rows) {
  const reasons = families(row);
  if (reasons.length > 0) fired.push(candidate(row, reasons.join("+")));
  else quiet.push(row);
}

const control = stableSample(quiet, CONTROL).map((row) => candidate(row, "control"));
const candidates = [...fired, ...control];

let existing: PoolRow[] = [];
try {
  existing = parsePool(readFileSync(PATH, "utf8"));
} catch (error) {
  // A missing file is the first run. A malformed one is a real problem and
  // must not be silently replaced with an empty pool — that would delete
  // every label in it.
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const merged = mergePool(existing, candidates);
const labeled = merged.filter((row) => row.verdict !== "").length;
const retired = merged.filter((row) => row.reason === "retired").length;

mkdirSync("eval", { recursive: true });
writeFileSync(PATH, formatPool(merged));

console.log(
  `\npool: ${fired.length} fired at ${POOL.price} sigma / ${POOL.volume}x, ` +
    `${control.length} control, ${merged.length} rows total`,
);
console.log(`labeled: ${labeled}/${merged.length}${retired > 0 ? `, ${retired} retired` : ""}`);
console.log(`written: ${PATH}`);
