import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDailyBars, type DailyBar } from "@/lib/massive";
import { ingestionSymbols } from "@/lib/universe";

/**
 * The shared half of price ingestion: the cron route and the backfill script
 * both go through here, so "which symbols count" and "how a bar is written"
 * cannot drift between them.
 *
 * Server-side only — everything here writes with the secret key.
 */

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * The universe, read from the table rather than a constant.
 *
 * `companies` is already the authority — the watchlist foreign-keys to it and
 * so does `daily_bars`. A second hardcoded list here would be a third place to
 * forget when the universe changes.
 *
 * Deliberately unfiltered by `kind`: benchmark rows are ingested alongside
 * companies. They arrive free in the same grouped-daily response, and
 * relative performance needs their bars. The product surfaces filter to
 * companies; ingestion must not.
 */
export async function loadUniverse(
  admin: AdminClient,
): Promise<ReadonlySet<string>> {
  const { data, error } = await admin.from("companies").select("symbol");
  if (error) throw error;
  return ingestionSymbols(data ?? []);
}

/**
 * Dates from `candidates` still worth fetching, newest first.
 *
 * A date drops out for either of two reasons: we already hold bars for it, or
 * we have already established the market was shut. The second is why
 * `market_days` exists — an empty `daily_bars` cannot distinguish "not fetched"
 * from "nothing to fetch", so without it every holiday is re-requested forever.
 *
 * Presence of any row is treated as "done". The grouped endpoint returns the
 * whole market in one response, so a date is written completely or not at all;
 * there is no partial state to detect.
 */
export async function missingDates(
  admin: AdminClient,
  candidates: readonly string[],
): Promise<string[]> {
  if (candidates.length === 0) return [];

  // Chunked because a backfill asks about two years at once. PostgREST puts
  // `in.(...)` in the query string, and ~500 dates overruns the URL length
  // long before it overruns anything else.
  const CHUNK = 100;
  const settled = new Set<string>();

  for (let i = 0; i < candidates.length; i += CHUNK) {
    const chunk = candidates.slice(i, i + CHUNK) as string[];

    const [bars, days] = await Promise.all([
      admin.from("daily_bars").select("trade_date").in("trade_date", chunk),
      admin.from("market_days").select("trade_date").in("trade_date", chunk),
    ]);

    if (bars.error) throw bars.error;
    if (days.error) throw days.error;

    for (const row of bars.data ?? []) settled.add(row.trade_date);
    for (const row of days.data ?? []) settled.add(row.trade_date);
  }

  return candidates.filter((date) => !settled.has(date));
}

/**
 * Record whether a date traded.
 *
 * Written for every date actually fetched, including the ones that returned
 * rows — a positive record costs nothing and makes the table answer "was this
 * a trading day" on its own, which M7's pre-open digest and M9's chart both
 * need later.
 */
export async function recordMarketDay(
  admin: AdminClient,
  date: string,
  isTrading: boolean,
): Promise<void> {
  const { error } = await admin
    .from("market_days")
    .upsert(
      { trade_date: date, is_trading: isTrading, checked_at: new Date().toISOString() },
      { onConflict: "trade_date" },
    );

  if (error) throw error;
}

/**
 * Write bars, replacing any that are already there.
 *
 * Upsert rather than insert because a re-run must be harmless: the backfill
 * can be interrupted and restarted, and the cron can overlap a manual run.
 * `adjusted=true` also means a split restates history, so an old date can come
 * back with different numbers and should overwrite rather than conflict.
 */
export async function upsertBars(
  admin: AdminClient,
  bars: readonly DailyBar[],
): Promise<number> {
  if (bars.length === 0) return 0;

  const { error } = await admin.from("daily_bars").upsert(
    bars.map((bar) => ({
      symbol: bar.symbol,
      trade_date: bar.tradeDate,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      vwap: bar.vwap,
      volume: bar.volume,
      trades: bar.trades,
    })),
    { onConflict: "symbol,trade_date" },
  );

  if (error) throw error;
  return bars.length;
}

/**
 * Fetch one date, write its bars, and record whether it traded.
 *
 * Returns how many rows landed — zero means the market was shut, which is a
 * successful outcome, not a failure. The bars are written before the
 * market-day record so an interruption between the two leaves the date looking
 * unfetched and it is simply retried, rather than leaving it marked done with
 * nothing behind it.
 */
export async function ingestDate(
  admin: AdminClient,
  date: string,
  universe: ReadonlySet<string>,
): Promise<number> {
  const bars = await fetchDailyBars(date, universe);
  const written = await upsertBars(admin, bars);
  await recordMarketDay(admin, date, written > 0);
  return written;
}
