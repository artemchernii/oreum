/**
 * The selection rules for `companies` rows, in one place.
 *
 * Since 0003 the table holds two kinds of row: the 25-company universe and
 * the benchmark ETFs (SPY, QQQ, SOXX, IGV, XLK). The two consumers want
 * different slices, and each slice is a product invariant:
 *
 * - Ingestion keeps *everything*. Benchmarks arrive free in the grouped-daily
 *   response, and relative performance needs their bars.
 * - The product surfaces keep *companies only*. Benchmarks are calibration
 *   data and must never appear in the watchlist or the universe picker.
 *
 * Pure functions, so the rules are testable without a database.
 */

export type CompanyKind = "company" | "benchmark";

/** True for rows the product may surface. Benchmarks fail this on purpose. */
export function isCompany(row: { kind: string }): boolean {
  return row.kind === "company";
}

/**
 * Every symbol ingestion should keep from the grouped-daily response —
 * benchmarks included. Narrowing this to companies would silently kill
 * relative performance, which is why it is a named, tested rule rather than
 * an inline `map`.
 */
export function ingestionSymbols(
  rows: readonly { symbol: string }[],
): ReadonlySet<string> {
  return new Set(rows.map((row) => row.symbol));
}
