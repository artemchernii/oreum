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
 * Reads only. Run:
 *   node --env-file=.env.local scripts/replay.ts
 */
import { createClient } from "@supabase/supabase-js";
import { observe, type ObservationBar } from "../src/lib/observations.ts";

/** Sessions of history each measurement is judged against — about a quarter. */
const WINDOW = 60;

/** Swept, not chosen. The quiet-day rate picks the threshold, not taste. */
const PRICE_THRESHOLDS = [2, 2.5, 3, 3.5, 4, 4.5, 5];
const VOLUME_THRESHOLDS = [2, 3, 4, 5];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/**
 * Every row of a table, a page at a time.
 *
 * PostgREST caps a response at 1000 rows. A single un-paged select would
 * silently return the first 1000 of 15,060 bars and the replay would report
 * confident numbers about a sixteenth of the history.
 */
async function selectAll<T>(
  table: string,
  columns: string,
  orderBy: readonly string[],
): Promise<T[]> {
  const page = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += page) {
    // A stable total order is what makes paging correct: without it PostgREST
    // may return the same row on two pages and miss another entirely.
    let query = supabase.from(table).select(columns);
    for (const column of orderBy) query = query.order(column);

    const { data, error } = await query.range(from, from + page - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as T[]));
    if (data.length < page) break;
  }

  return rows;
}

type CompanyRow = {
  symbol: string;
  kind: string;
  benchmark_symbol: string | null;
};
type BarRow = {
  symbol: string;
  trade_date: string;
  close: string | number;
  volume: string | number | null;
};

function pct(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}

const companies = await selectAll<CompanyRow>(
  "companies",
  "symbol, kind, benchmark_symbol",
  ["symbol"],
);
const bars = await selectAll<BarRow>(
  "daily_bars",
  "symbol, trade_date, close, volume",
  ["symbol", "trade_date"],
);

// Money and volume arrive as strings from a numeric column. Number() here is
// deliberate and safe: this is analysis, not storage or display.
const bySymbol = new Map<string, ObservationBar[]>();
for (const row of bars) {
  const list = bySymbol.get(row.symbol) ?? [];
  list.push({
    date: row.trade_date,
    close: Number(row.close),
    volume: Number(row.volume ?? 0),
  });
  bySymbol.set(row.symbol, list);
}
for (const list of bySymbol.values()) list.sort((a, b) => a.date.localeCompare(b.date));

const tradable = companies.filter((row) => row.kind === "company");

console.log(
  `universe: ${tradable.length} companies, ` +
    `${companies.length - tradable.length} benchmarks, ` +
    `${bars.length} bars`,
);

// Every observation in the universe, computed once and swept many times.
type Row = { symbol: string } & ReturnType<typeof observe>[number];
const all: Row[] = [];

for (const company of tradable) {
  const series = bySymbol.get(company.symbol);
  if (!series) continue;

  const benchmarkBars = company.benchmark_symbol
    ? bySymbol.get(company.benchmark_symbol)
    : undefined;

  for (const observation of observe({ bars: series, benchmarkBars, window: WINDOW })) {
    all.push({ symbol: company.symbol, ...observation });
  }
}

const sessions = [...new Set(all.map((row) => row.date))].sort();
const spanStart = sessions.at(0);
const spanEnd = sessions.at(-1);

console.log(
  `observations: ${all.length} over ${sessions.length} sessions ` +
    `(${spanStart} to ${spanEnd}), window ${WINDOW}, warmup excluded`,
);
console.log(
  `benchmark coverage: ${pct(all.filter((r) => r.relative !== null).length, all.length)} ` +
    `of observations have a benchmark bar\n`,
);

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

const mag = (value: number | null) => (value === null ? 0 : Math.abs(value));

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
