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
 * Three sizes are swept against the same two shapes, defined in
 * `src/lib/attention.ts`: unusual for the symbol, big in absolute terms, and
 * both at once. The tables are meant to be read at matching quiet-day rates,
 * never at matching threshold numbers.
 *
 *   node --env-file=.env.local scripts/score.ts
 */
import { readFileSync } from "node:fs";
import { loadMarket } from "./data.ts";
import { both, percent, shapes, sigma, type Rule } from "../src/lib/attention.ts";
import { evaluate, parsePool, type Judged, type Verdict } from "../src/lib/evaluation.ts";

const PATH = "eval/labels.tsv";

const SIGMA_THRESHOLDS = [2, 2.5, 3, 3.5, 4, 5];

/**
 * Swept to bracket roughly the same quiet-day range as the sigma sweep — see
 * the printed quiet column and adjust these if the two tables stop lining up.
 */
const PCT_THRESHOLDS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.1];

/**
 * The conjunction sweep: a percentage floor crossed with a sigma floor.
 *
 * Lower on both axes than the single-family sweeps, because requiring both can
 * only fire less than either alone — a pair that reads as strict here lands at
 * the quiet rate of a much lower single threshold.
 */
const BOTH_THRESHOLDS = [0.02, 0.03, 0.04, 0.05].flatMap((percentage) =>
  [2, 2.5, 3].map((deviations) => [percentage, deviations] as const),
);

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
    `${rule.label.padEnd(30)} ` +
      `${String(days.size).padStart(5)}/${market.sessions.length}  ` +
      `${pct(quiet)}  ` +
      `${(days.size === 0 ? 0 : firing.length / days.size).toFixed(1).padStart(11)}  ` +
      `${pct(result.recall)}  ${pct(result.precision)}  ${pct(result.majorRecall)}`,
  );
}

const header =
  "rule                              email days    quiet  items/email     recall  precision  major";

console.log("── volatility-adjusted (the premise the engine rests on) ──");
console.log(header);
for (const threshold of SIGMA_THRESHOLDS) {
  for (const rule of shapes(sigma(threshold))) report(rule);
}

console.log(
  "\n── raw percentage, for comparison (the premise 133 labels put in question) ──",
);
console.log(header);
for (const threshold of PCT_THRESHOLDS) {
  for (const rule of shapes(percent(threshold))) report(rule);
}

console.log("\n── both at once: big in absolute terms and unusual for the symbol ──");
console.log(header);
for (const [percentage, deviations] of BOTH_THRESHOLDS) {
  for (const rule of shapes(both(percentage, deviations))) report(rule);
}

console.log(
  `\nAccuracy columns are over ${judged} labeled rows. They mean nothing until ` +
    `that number is large enough to argue with.\n` +
    `Read the tables at matching quiet-day rates, not matching threshold numbers — ` +
    `a sigma and a percentage are not the same unit.`,
);
