import { createClient } from "@/lib/supabase/server";
import { RANGES, type HistoryBar } from "@/lib/price-history";

/**
 * Reading the price cache.
 *
 * This is the seam that replaces `quoteFor()` from the mock. Same contract: a
 * symbol with no data returns nothing and the UI renders an em dash, because
 * a plausible invented number would hide exactly the gap worth seeing.
 *
 * Reads go through the ordinary (publishable-key) client, not the admin one —
 * `daily_bars` is readable by everyone by policy. Only ingestion needs the
 * secret key.
 */

export type Quote = {
  symbol: string;
  /** Close of the most recent session held. Never today's: see docs/prices.md. */
  price: number;
  /**
   * Change against the previous session *we hold*, not "yesterday". A series
   * is never contiguous — holidays, missed runs, a symbol added late — so
   * computing against a calendar date would silently compare across a gap.
   * Null when only one bar exists, which is honest rather than 0.00%.
   */
  changePercent: number | null;
  /** Trade date of `price`, so the UI can label it instead of implying "live". */
  asOf: string;
  /** Closes oldest to newest, for the sparkline. */
  series: number[];
};

const SERIES_LENGTH = 30;

/**
 * Calendar days scanned to find those sessions. Thirty trading days need about
 * forty-five calendar days once weekends and holidays are removed; the margin
 * absorbs a long holiday week.
 */
const WINDOW_DAYS = 45;

export async function getQuotes(
  symbols: readonly string[],
): Promise<Map<string, Quote>> {
  const quotes = new Map<string, Quote>();
  if (symbols.length === 0) return quotes;

  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - WINDOW_DAYS);

  const { data, error } = await supabase
    .from("daily_bars")
    .select("symbol, trade_date, close")
    .in("symbol", symbols as string[])
    .gte("trade_date", since.toISOString().slice(0, 10))
    // Descending matters. PostgREST caps rows server-side, and with an
    // ascending order a truncated result would drop the *newest* sessions —
    // the ones the price is read from. Descending truncates the oldest, which
    // only shortens the sparkline.
    .order("trade_date", { ascending: false })
    .limit(symbols.length * (SERIES_LENGTH + 8));

  if (error) throw error;

  const bars = new Map<string, { date: string; close: number }[]>();
  for (const row of data ?? []) {
    const list = bars.get(row.symbol) ?? [];
    list.push({ date: row.trade_date, close: row.close });
    bars.set(row.symbol, list);
  }

  for (const [symbol, rows] of bars) {
    const quote = buildQuote(symbol, rows);
    if (quote) quotes.set(symbol, quote);
  }

  return quotes;
}

/** A bar as it comes out of the grouping step, newest first. */
export type ClosingBar = { date: string; close: number };

/**
 * Turn one symbol's bars into a quote. Split out from `getQuotes` so the
 * arithmetic can be tested without a database — it is the part most likely to
 * be quietly wrong, and "quietly wrong" is the failure mode that matters when
 * the output is a price.
 *
 * `rows` must be newest first, which is the order the query returns.
 */
export function buildQuote(
  symbol: string,
  rows: readonly ClosingBar[],
): Quote | null {
  const latest = rows[0];
  if (!latest) return null;

  const previous = rows[1];

  return {
    symbol,
    price: latest.close,
    changePercent: previous
      ? ((latest.close - previous.close) / previous.close) * 100
      : null,
    asOf: latest.date,
    series: rows
      .slice(0, SERIES_LENGTH)
      .map((bar) => bar.close)
      .reverse(),
  };
}

/**
 * Every close held for `symbol` within the longest offered window.
 *
 * Fetches the full 2Y once and lets the client slice it. Around 500 numbers is
 * a few kilobytes on the wire, and it makes the timeframe control instant with
 * no loading state and no round trip — the alternative is five server
 * fetches to draw subsets of data we already sent.
 */
export async function getPriceHistory(symbol: string): Promise<HistoryBar[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - RANGES["2Y"]);

  const { data, error } = await supabase
    .from("daily_bars")
    .select("trade_date, close")
    .eq("symbol", symbol)
    .gte("trade_date", since.toISOString().slice(0, 10))
    // Ascending is safe here, unlike in `getQuotes`: the chart wants the whole
    // window rather than the newest N, and the limit below is above two years
    // of sessions, so truncation cannot reach the recent end.
    .order("trade_date", { ascending: true })
    .limit(800);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    date: row.trade_date,
    close: row.close,
  }));
}
