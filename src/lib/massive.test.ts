import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MassiveEntitlementError,
  recentTradingDateCandidates,
} from "@/lib/massive";

describe("recentTradingDateCandidates", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts at yesterday, never today", () => {
    // Basic refuses the current session for hours after the close, so asking
    // for today only ever spends a request to be told no.
    vi.setSystemTime(new Date("2026-08-28T23:00:00Z"));

    const dates = recentTradingDateCandidates(5);

    expect(dates[0]).toBe("2026-08-27");
    expect(dates).not.toContain("2026-08-28");
  });

  it("drops weekends", () => {
    // From Monday 2026-08-31, yesterday is Sunday the 30th; the 30th and 29th
    // must both fall out, landing on Friday the 28th.
    vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));

    const dates = recentTradingDateCandidates(5);

    expect(dates).not.toContain("2026-08-30");
    expect(dates).not.toContain("2026-08-29");
    expect(dates[0]).toBe("2026-08-28");
  });

  it("returns newest first", () => {
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));

    const dates = recentTradingDateCandidates(10);

    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("scans calendar days, so the count is smaller than the window", () => {
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));

    // 10 calendar days back from the 27th spans two weekends' worth of
    // Saturdays and Sundays.
    expect(recentTradingDateCandidates(10).length).toBeLessThan(10);
    expect(recentTradingDateCandidates(10).length).toBeGreaterThan(4);
  });

  it("uses UTC, so a late-evening local clock does not skip a day", () => {
    // 23:30 in a UTC+2 zone is already the next UTC day. Deriving the cursor
    // from local time here would silently drop a session.
    vi.setSystemTime(new Date("2026-08-28T21:30:00Z"));

    expect(recentTradingDateCandidates(3)[0]).toBe("2026-08-27");
  });
});

describe("MassiveEntitlementError.isNotYetPublished", () => {
  // This single boolean decides whether a backfill stops or keeps walking, so
  // it is worth pinning to the provider's actual wording.
  it("recognises the not-yet-published edge", () => {
    const error = new MassiveEntitlementError(
      "2026-08-31",
      "Attempted to request today's data before end of day. Please upgrade your plan at https://polygon.io/pricing",
    );

    expect(error.isNotYetPublished).toBe(true);
  });

  it("treats an out-of-plan history message as the far edge", () => {
    const error = new MassiveEntitlementError(
      "2023-08-31",
      "Your plan doesn't include this data timeframe. Please upgrade your plan.",
    );

    expect(error.isNotYetPublished).toBe(false);
  });

  it("keeps the date it failed on", () => {
    expect(new MassiveEntitlementError("2026-08-31", "x").date).toBe(
      "2026-08-31",
    );
  });
});
