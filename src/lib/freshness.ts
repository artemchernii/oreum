/**
 * How stale the price cache is.
 *
 * Split from the health route so the date arithmetic is testable — off-by-one
 * errors here are the kind that read as plausible and go unnoticed, which is
 * the same argument that put `buildQuote` in its own function.
 */

/**
 * Age beyond which the cache is called stale.
 *
 * Four days rather than one, because a healthy cache is routinely three days
 * behind: Friday's close is the newest data available all weekend, and the
 * provider does not publish the current session at all. A threshold of one
 * would cry wolf every Saturday, and an alarm that always fires is not an
 * alarm. A long weekend plus a holiday still fits under four.
 */
export const STALE_AFTER_DAYS = 4;

/**
 * Whole days from a trade date to `now`, both taken as UTC calendar dates.
 *
 * Compared date-to-date rather than instant-to-instant: a trade date has no
 * time of day, so subtracting timestamps would make the answer depend on what
 * hour the check happened to run.
 */
export function tradeDateAgeDays(tradeDate: string, now: Date): number {
  const from = new Date(`${tradeDate}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - from) / 86_400_000);
}

export function isStale(ageDays: number | null): boolean {
  return ageDays === null || ageDays > STALE_AFTER_DAYS;
}
