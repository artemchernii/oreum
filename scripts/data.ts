/**
 * The read side the Phase 1 scripts share.
 *
 * Extracted so the paging rule below exists once. It was written twice
 * otherwise, and an un-paged select is the kind of bug that does not announce
 * itself: it returns confident numbers about a sixteenth of the history.
 *
 * Read-only, and anon-readable — none of this needs the secret key.
 */
import { createClient } from "@supabase/supabase-js";
import { observe, type Observation, type ObservationBar } from "../src/lib/observations.ts";

/** Sessions of history each measurement is judged against — about a quarter. */
export const WINDOW = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/**
 * Every row of a table, a page at a time.
 *
 * PostgREST caps a response at 1000 rows. A single un-paged select would
 * silently return the first 1000 of 15,060 bars.
 */
export async function selectAll<T>(
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

export type CompanyRow = {
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

/** One symbol's measurements for one session, tagged with what the symbol is. */
export type ObservedRow = { symbol: string; kind: "company" | "benchmark" } & Observation;

export type Market = {
  rows: ObservedRow[];
  /** Every session any observation lands on, ascending. */
  sessions: string[];
  companies: number;
  benchmarks: number;
  bars: number;
};

/**
 * Every observation in the universe — benchmarks included.
 *
 * Benchmarks are observed as entities in their own right, not only as
 * denominators. A market-wide day is one item about SPY rather than
 * twenty-four items that each imply company news, and that item cannot exist
 * unless the benchmark is measured like anything else.
 *
 * A benchmark gets no benchmark of its own: SPY relative to SPY is zero by
 * construction, so only the price and volume families can speak for it.
 */
export async function loadMarket(): Promise<Market> {
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
  for (const list of bySymbol.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  const rows: ObservedRow[] = [];

  for (const company of companies) {
    const series = bySymbol.get(company.symbol);
    if (!series) continue;

    const kind = company.kind === "company" ? "company" : "benchmark";
    const benchmarkBars =
      kind === "company" && company.benchmark_symbol
        ? bySymbol.get(company.benchmark_symbol)
        : undefined;

    for (const observation of observe({ bars: series, benchmarkBars, window: WINDOW })) {
      rows.push({ symbol: company.symbol, kind, ...observation });
    }
  }

  return {
    rows,
    sessions: [...new Set(rows.map((row) => row.date))].sort(),
    companies: companies.filter((row) => row.kind === "company").length,
    benchmarks: companies.filter((row) => row.kind !== "company").length,
    bars: bars.length,
  };
}

// Re-exported so the scripts keep one import for the read side, while the
// definition lives with the rules that depend on it. Two copies of "null means
// it did not fire" would be two chances to get it backwards.
export { mag } from "../src/lib/attention.ts";
