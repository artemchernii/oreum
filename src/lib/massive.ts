/**
 * Massive (formerly Polygon.io) — the price provider.
 *
 * Only the grouped-daily endpoint is used. It returns every US ticker for one
 * trading date in a single call, so the whole 25-symbol universe costs one
 * request per day rather than 25. On the free Basic tier that turns a
 * 5-requests-per-minute limit into a non-issue.
 *
 * Server-side only. The key is paid-tier-adjacent and must never reach the
 * browser, so nothing here may be imported from a client component.
 */

const BASE_URL = "https://api.massive.com";

/** One symbol's trading day, already narrowed to our universe. */
export type DailyBar = {
  symbol: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vwap: number | null;
  volume: number | null;
  trades: number | null;
};

/** The provider's row shape. Single-letter keys are theirs, not ours. */
type GroupedRow = {
  T: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  vw?: number;
  n?: number;
  t: number;
};

type GroupedResponse = {
  status?: string;
  resultsCount?: number;
  results?: GroupedRow[];
  message?: string;
};

/**
 * A request the plan does not cover. Massive answers 403 at *both* edges of
 * the entitlement window — a date too recent ("before end of day") and a date
 * older than the two years Basic retains — so the message is what tells them
 * apart, and callers care about the difference: the backfill stops at the old
 * edge, the cron shrugs at the new one.
 */
export class MassiveEntitlementError extends Error {
  readonly date: string;

  constructor(date: string, message: string) {
    super(message);
    this.name = "MassiveEntitlementError";
    this.date = date;
  }

  /** True when the date is simply not published yet, rather than too old. */
  get isNotYetPublished(): boolean {
    return this.message.toLowerCase().includes("before end of day");
  }
}

export class MassiveError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MassiveError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY is not set");
  return key;
}

/**
 * Every bar for `date`, filtered to `universe`.
 *
 * Returns an empty array when the market was shut — Massive answers 200 with
 * `resultsCount: 0` for weekends and holidays, which is a valid answer, not a
 * failure. Throws `MassiveEntitlementError` on 403 so the caller can tell
 * "not published yet" from "older than your plan retains".
 *
 * `date` is `YYYY-MM-DD` and is used verbatim as the stored trade date. The
 * response's own timestamps all point at that session's close (20:00Z under
 * EDT, 21:00Z under EST), so both agree on the UTC date and the requested one
 * needs no conversion.
 */
export async function fetchDailyBars(
  date: string,
  universe: ReadonlySet<string>,
): Promise<DailyBar[]> {
  const url = new URL(
    `${BASE_URL}/v2/aggs/grouped/locale/us/market/stocks/${date}`,
  );
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("apiKey", apiKey());

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    // The body carries the useful part; the status alone cannot distinguish
    // the two entitlement edges. Failing to parse it is not worth throwing over.
    let message = `Massive answered ${res.status}`;
    try {
      const body = (await res.json()) as GroupedResponse;
      if (body.message) message = body.message;
    } catch {
      // Keep the status-only message.
    }

    if (res.status === 403) throw new MassiveEntitlementError(date, message);
    throw new MassiveError(res.status, message);
  }

  const body = (await res.json()) as GroupedResponse;

  return (body.results ?? [])
    .filter((row) => universe.has(row.T))
    .map((row) => ({
      symbol: row.T,
      tradeDate: date,
      open: row.o,
      high: row.h,
      low: row.l,
      close: row.c,
      vwap: row.vw ?? null,
      volume: row.v ?? null,
      // Transaction counts are whole; the fractional field is volume.
      trades: row.n ?? null,
    }));
}

/**
 * Calendar dates from `days` ago up to yesterday, newest first, weekends
 * dropped.
 *
 * Yesterday is the newest candidate on purpose: Basic will not serve the
 * current day even hours after the close — verified at 19:00 ET, three hours
 * past it — so asking for today only ever spends a request to be told no.
 *
 * Holidays are not filtered, because there is no holiday calendar here worth
 * maintaining. A closed date costs one request and returns zero rows.
 */
export function recentTradingDateCandidates(days: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  for (let i = 0; i < days; i += 1) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return dates;
}
