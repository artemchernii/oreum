/**
 * Phase 1 threshold replay.
 *
 * Answers the question the email depends on: at a given threshold, how often
 * would Oreum have said anything at all over the two years of history held?
 *
 * A quiet day must be possible, so the metric that matters is the quiet-day
 * rate. A threshold that fires most days is not an attention engine, it is a
 * broker alert feed with extra steps — and the product exists to replace one
 * of those.
 *
 * This measures volume only. Whether it fires on the *right* days is
 * `scripts/score.ts`, which needs the labels `scripts/pool.ts` collects.
 *
 * Reads only. Run:
 *   node --env-file=.env.local scripts/replay.ts
 */
import { loadMarket, mag, WINDOW } from "./data.ts";

/** Swept, not chosen. The quiet-day rate picks the threshold, not taste. */
const PRICE_THRESHOLDS = [2, 2.5, 3, 3.5, 4, 4.5, 5];
const VOLUME_THRESHOLDS = [2, 3, 4, 5];

function pct(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}

const market = await loadMarket();

// Companies only, so the numbers stay comparable with the table published in
// docs/intelligence.md. Benchmarks as items are scored in scripts/score.ts.
const all = market.rows.filter((row) => row.kind === "company");
const sessions = [...new Set(all.map((row) => row.date))].sort();

console.log(
  `universe: ${market.companies} companies, ${market.benchmarks} benchmarks, ` +
    `${market.bars} bars`,
);
console.log(
  `observations: ${all.length} over ${sessions.length} sessions ` +
    `(${sessions.at(0)} to ${sessions.at(-1)}), window ${WINDOW}, warmup excluded`,
);
console.log(
  `benchmark coverage: ${pct(all.filter((r) => r.relative !== null).length, all.length)} ` +
    `of observations have a benchmark bar\n`,
);

type Row = (typeof all)[number];

/** How the email would have behaved under one rule. */
function report(label: string, fires: (row: Row) => boolean) {
  const firing = all.filter(fires);
  const days = new Set(firing.map((row) => row.date));
  const quiet = sessions.length - days.size;
  // 252 trading sessions a year, five a week.
  const perWeek = (days.size / sessions.length) * 5;

  console.log(
    `${label.padEnd(34)} ` +
      `items ${String(firing.length).padStart(5)}  ` +
      `email days ${String(days.size).padStart(4)}/${sessions.length}  ` +
      `quiet ${pct(quiet, sessions.length).padStart(6)}  ` +
      `${perWeek.toFixed(1)} emails/wk  ` +
      `${days.size === 0 ? "—" : (firing.length / days.size).toFixed(1)} items/email`,
  );
}

console.log("── price anomaly: |return| in units of the symbol's own volatility");
for (const t of PRICE_THRESHOLDS) {
  report(`  |vol-adjusted| >= ${t}`, (row) => mag(row.volatilityAdjusted) >= t);
}

console.log("\n── relative-performance anomaly: move net of its benchmark");
for (const t of PRICE_THRESHOLDS) {
  report(`  |relative-adjusted| >= ${t}`, (row) => mag(row.relativeAdjusted) >= t);
}

console.log("\n── volume anomaly: volume against its own median baseline");
for (const t of VOLUME_THRESHOLDS) {
  report(`  volume >= ${t}x median`, (row) => (row.volume ?? 0) >= t);
}

console.log("\n── combined: price OR relative OR volume (the email's real rule)");
for (const t of PRICE_THRESHOLDS) {
  const volumeGate = 4;
  report(
    `  price/rel >= ${t} or volume >= ${volumeGate}x`,
    (row) =>
      mag(row.volatilityAdjusted) >= t ||
      mag(row.relativeAdjusted) >= t ||
      (row.volume ?? 0) >= volumeGate,
  );
}

// A threshold table is only trustworthy if the extremes are real events rather
// than arithmetic artefacts, so name the biggest ones and check them by eye.
console.log("\n── largest price anomalies held (eyeball check against reality)");
for (const row of [...all]
  .sort((a, b) => mag(b.volatilityAdjusted) - mag(a.volatilityAdjusted))
  .slice(0, 12)) {
  console.log(
    `  ${row.date}  ${row.symbol.padEnd(5)} ` +
      `${(row.change * 100).toFixed(1).padStart(6)}%  ` +
      `${row.volatilityAdjusted?.toFixed(1).padStart(6)} sigma  ` +
      `rel ${row.relativeAdjusted?.toFixed(1).padStart(6)}  ` +
      `vol ${row.volume?.toFixed(1).padStart(5)}x`,
  );
}
