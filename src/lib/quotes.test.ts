import { describe, expect, it } from "vitest";
import { buildQuote } from "@/lib/quotes";

describe("buildQuote", () => {
  it("reads the price from the newest bar, not the oldest", () => {
    // Rows arrive newest first. Reading rows[rows.length - 1] instead would
    // put a month-old close on screen and look entirely plausible.
    const quote = buildQuote("AAPL", [
      { date: "2026-08-28", close: 319.7 },
      { date: "2026-08-27", close: 314.58 },
    ]);

    expect(quote?.price).toBe(319.7);
    expect(quote?.asOf).toBe("2026-08-28");
  });

  it("computes change against the previous bar held", () => {
    const quote = buildQuote("AAPL", [
      { date: "2026-08-28", close: 110 },
      { date: "2026-08-27", close: 100 },
    ]);

    expect(quote?.changePercent).toBeCloseTo(10, 10);
  });

  it("computes change across a gap without pretending it is one day", () => {
    // A holiday, a missed cron run, or a symbol added late all produce this.
    // The number is a real two-week move; the point is that it is computed
    // from bars we actually hold rather than from a calendar assumption.
    const quote = buildQuote("AAPL", [
      { date: "2026-08-28", close: 120 },
      { date: "2026-08-14", close: 100 },
    ]);

    expect(quote?.changePercent).toBeCloseTo(20, 10);
  });

  it("returns null change on a single bar rather than zero", () => {
    // 0.00% claims "unchanged". One bar means "unknown". Different claims,
    // and the UI renders them differently.
    const quote = buildQuote("ARM", [{ date: "2026-08-28", close: 145.2 }]);

    expect(quote?.changePercent).toBeNull();
    expect(quote?.price).toBe(145.2);
  });

  it("returns null for a symbol with no bars at all", () => {
    expect(buildQuote("SNOW", [])).toBeNull();
  });

  it("handles a negative move", () => {
    const quote = buildQuote("AVGO", [
      { date: "2026-08-28", close: 90 },
      { date: "2026-08-27", close: 100 },
    ]);

    expect(quote?.changePercent).toBeCloseTo(-10, 10);
  });

  it("orders the sparkline oldest to newest", () => {
    // The query returns newest first; a sparkline drawn in that order is the
    // chart backwards, which reads as a plausible trend in the wrong direction.
    const quote = buildQuote("TSM", [
      { date: "2026-08-28", close: 3 },
      { date: "2026-08-27", close: 2 },
      { date: "2026-08-26", close: 1 },
    ]);

    expect(quote?.series).toEqual([1, 2, 3]);
  });

  it("caps the sparkline at 30 points, keeping the newest", () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({
      date: `2026-08-${String(45 - i).padStart(2, "0")}`,
      close: 45 - i,
    }));

    const quote = buildQuote("MSFT", rows);

    expect(quote?.series).toHaveLength(30);
    // Newest value survives; oldest is the 30th back, not the 45th.
    expect(quote?.series.at(-1)).toBe(45);
    expect(quote?.series[0]).toBe(16);
  });
});
