/**
 * Massive (formerly Polygon.io) — the price provider.
 *
 * Only the grouped-daily endpoint is used. It returns every US ticker for one
 * trading date in a single call, so the whole ingestion universe — companies
 * and benchmark ETFs alike — costs one request per day. On the free Basic
 * tier that turns a 5-requests-per-minute limit into a non-issue.
 *
 * Server-side only. The key is paid-tier-adjacent and must never reach the
 * browser, so nothing here may be imported from a client component.
 */

import { z } from "zod";

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

/**
 * The provider's row shape. Single-letter keys are theirs, not ours.
 *
 * A schema rather than a type assertion, because `as GroupedResponse` over
 * third-party JSON is a promise the compiler cannot keep: if Massive changes a
 * field, TypeScript believes the assertion and the wrong number reaches
 * `daily_bars` with nothing raising a hand. Prices are money — the failure has
 * to be loud.
 *
 * `v`, `vw` and `n` are optional because the provider omits them on thin
 * sessions. `v` is deliberately not an integer: volume comes back fractional
 * on most rows.
 */
const groupedRowSchema = z.object({
  T: z.string(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().optional(),
  vw: z.number().optional(),
  n: z.number().optional(),
  t: z.number(),
});

/**
 * The envelope is validated loosely on purpose. `results` stays `unknown[]`
 * here so a malformed row belonging to some unrelated penny stock cannot fail
 * a batch — we take ~30 rows out of ~12,500 and only those get parsed
 * strictly. Validating all of them would be both slower and more fragile.
 */
const groupedResponseSchema = z.object({
  status: z.string().optional(),
  resultsCount: z.number().optional(),
  results: z.array(z.unknown()).optional(),
  message: z.string().optional(),
});

/** The error body, which is the only place the entitlement reason appears. */
const errorBodySchema = z.object({ message: z.string().optional() });

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

/**
 * The provider answered 200 with a body we do not recognise. Separate from
 * `MassiveError` because it means our assumptions drifted from theirs, not
 * that the request failed — and it should never be swallowed the way a 403 is.
 */
export class MassiveSchemaError extends Error {
  readonly date: string;

  constructor(date: string, message: string) {
    super(message);
    this.name = "MassiveSchemaError";
    this.date = date;
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
      const body = errorBodySchema.safeParse(await res.json());
      if (body.success && body.data.message) message = body.data.message;
    } catch {
      // Keep the status-only message.
    }

    if (res.status === 403) throw new MassiveEntitlementError(date, message);
    throw new MassiveError(res.status, message);
  }

  const parsed = groupedResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new MassiveSchemaError(
      date,
      `grouped response did not match: ${parsed.error.issues[0]?.message ?? "unknown"}`,
    );
  }

  const bars: DailyBar[] = [];

  for (const candidate of parsed.data.results ?? []) {
    // Narrow enough to read the ticker, then discard everything outside the
    // universe before paying for full validation.
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("T" in candidate) ||
      typeof candidate.T !== "string" ||
      !universe.has(candidate.T)
    ) {
      continue;
    }

    const row = groupedRowSchema.safeParse(candidate);
    if (!row.success) {
      // A symbol we care about arriving malformed is not something to skip
      // quietly — that would write a gap and call it a success.
      throw new MassiveSchemaError(
        date,
        `row for ${candidate.T} did not match: ${row.error.issues[0]?.message ?? "unknown"}`,
      );
    }

    bars.push({
      symbol: row.data.T,
      tradeDate: date,
      open: row.data.o,
      high: row.data.h,
      low: row.data.l,
      close: row.data.c,
      vwap: row.data.vw ?? null,
      volume: row.data.v ?? null,
      // Transaction counts are whole; the fractional field is volume.
      trades: row.data.n ?? null,
    });
  }

  return bars;
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
