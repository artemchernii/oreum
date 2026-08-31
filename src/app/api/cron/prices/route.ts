import { createAdminClient } from "@/lib/supabase/admin";
import {
  MassiveEntitlementError,
  recentTradingDateCandidates,
} from "@/lib/massive";
import { ingestDate, loadUniverse, missingDates } from "@/lib/ingest-prices";

/**
 * Daily price ingestion.
 *
 * This job does not "fetch today". It asks the table which recent trading
 * dates are missing and fills those, newest first. That shape is forced by the
 * provider: on the free tier the current day is refused for hours after the
 * close — verified at 19:00 ET, three hours past it, still
 * "Attempted to request today's data before end of day" — and the exact moment
 * it lands is undocumented. Filling gaps instead of chasing a deadline means
 * the job is correct whether data arrives late, a run is skipped, or the
 * deployment was asleep for a week.
 *
 * It also satisfies the rule that a price series is never assumed contiguous:
 * gaps are the thing this looks for, not an edge case it hopes to avoid.
 */

/** How far back to look for holes on each run. */
const DEFAULT_LOOKBACK_DAYS = 10;

/**
 * Requests per run. Basic allows five a minute, and a run that needs more than
 * a couple of dates is catching up rather than keeping up — tomorrow's run
 * takes the next slice.
 */
const DEFAULT_MAX_DATES = 3;

/** Comfortably past the two years Basic retains, so the backfill self-limits. */
const MAX_LOOKBACK_DAYS = 800;

/** The provider's per-minute ceiling on the free tier. */
const MAX_DATES_CEILING = 5;

function boundedParam(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return Math.min(value, max);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }

  // Vercel Cron sends this header. The site is public — Deployment Protection
  // is deliberately off — so without the check anyone could drain the quota.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // The daily cron passes nothing and gets the defaults. Backfill is the
    // same code path with a wider window, driven by a shell loop rather than a
    // second script — one implementation means the two cannot drift, and the
    // upsert makes repeated runs harmless.
    const params = new URL(request.url).searchParams;
    const lookback = boundedParam(
      params.get("days"),
      DEFAULT_LOOKBACK_DAYS,
      MAX_LOOKBACK_DAYS,
    );
    const budget = boundedParam(
      params.get("max"),
      DEFAULT_MAX_DATES,
      MAX_DATES_CEILING,
    );

    const admin = createAdminClient();
    const universe = await loadUniverse(admin);
    const candidates = recentTradingDateCandidates(lookback);
    const outstanding = await missingDates(admin, candidates);
    const pending = outstanding.slice(0, budget);

    const written: Record<string, number> = {};
    const skipped: Record<string, string> = {};

    for (const date of pending) {
      try {
        written[date] = await ingestDate(admin, date, universe);
      } catch (error) {
        // A 403 here is ordinary rather than exceptional. "Not published" is
        // the newest edge — yesterday, asked for before Massive has published
        // it — and resolves itself on the next run. "Too old" is the far edge
        // of the two years Basic retains, and never resolves; a backfill that
        // reaches it is finished.
        if (error instanceof MassiveEntitlementError) {
          skipped[date] = error.isNotYetPublished ? "not published" : "too old";
          continue;
        }
        throw error;
      }
    }

    // A backfill loop stops on `remaining === 0 || exhausted`. Without
    // `exhausted` it would spin forever at the far edge of the history window,
    // where every date 403s as "too old" and `remaining` therefore never falls.
    // Dates are processed newest first, so that edge is only ever reached last.
    const exhausted =
      pending.length > 0 &&
      pending.every((date) => skipped[date] === "too old");

    return Response.json({
      ok: true,
      checked: candidates.length,
      outstanding: outstanding.length,
      remaining: Math.max(0, outstanding.length - Object.keys(written).length),
      exhausted,
      written,
      skipped,
    });
  } catch (error) {
    // Never echo the message from an upstream failure verbatim — provider
    // errors have carried the key in the URL before.
    console.error("price ingestion failed", error);
    return Response.json(
      { ok: false, error: "Ingestion failed" },
      { status: 500 },
    );
  }
}
