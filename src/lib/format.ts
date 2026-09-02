/**
 * Pure display formatting. No imports on purpose: client components need
 * these, and living in `quotes.ts` dragged the server-only Supabase client
 * into the browser bundle — a build error, and a leak of server code if it
 * had resolved.
 */

/**
 * "Fri 28 Aug" — the label that stops a stale close reading as a live price.
 *
 * Formatted in UTC deliberately. A trade date is a calendar date, not an
 * instant; rendering it in the viewer's zone moves it a day for anyone west of
 * Greenwich.
 */
export function formatTradeDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
