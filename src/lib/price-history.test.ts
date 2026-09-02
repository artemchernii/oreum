import { describe, expect, it } from "vitest";
import {
  RANGES,
  availableRanges,
  priceDomain,
  sliceRange,
  windowChange,
  type HistoryBar,
} from "@/lib/price-history";

/** Bars ascend by date, which is the order the chart draws them in. */
function bars(...entries: [string, number][]): HistoryBar[] {
  return entries.map(([date, close]) => ({ date, close }));
}

describe("sliceRange", () => {
  it("measures the window back from the newest bar, not from today", () => {
    // The cache is routinely three days behind — Friday's close is the newest
    // data all weekend, and the current session is never served at all. Anchor
    // the window on `new Date()` and a stale cache silently returns a shorter
    // window than the label promises.
    const series = bars(
      ["2026-06-01", 100],
      ["2026-07-15", 110],
      ["2026-08-31", 120],
    );

    const oneMonth = sliceRange(series, "1M");

    expect(oneMonth.map((bar) => bar.date)).toEqual(["2026-08-31"]);
  });

  it("includes a bar sitting exactly on the cutoff", () => {
    // 30 calendar days before 2026-08-31 is 2026-08-01. An exclusive
    // comparison would drop it, which is an off-by-one nobody would notice.
    const series = bars(["2026-08-01", 100], ["2026-08-31", 120]);

    expect(sliceRange(series, "1M")).toHaveLength(2);
  });

  it("returns everything when the history is shorter than the range", () => {
    const series = bars(["2026-08-28", 100], ["2026-08-31", 120]);

    expect(sliceRange(series, "2Y")).toHaveLength(2);
  });

  it("handles an empty series without throwing", () => {
    expect(sliceRange([], "1Y")).toEqual([]);
  });

  it("crosses a year boundary correctly", () => {
    // Naive month arithmetic (setMonth(-1)) is where this breaks.
    const series = bars(
      ["2025-12-20", 100],
      ["2026-01-05", 110],
      ["2026-01-15", 120],
    );

    expect(sliceRange(series, "1M").map((b) => b.date)).toEqual([
      "2025-12-20",
      "2026-01-05",
      "2026-01-15",
    ]);
  });

  it("offers no range longer than the provider retains", () => {
    // Basic keeps ~2 years. A "5Y" button that can never fill is a lie the
    // chart tells before the data even loads.
    expect(Object.keys(RANGES)).toEqual(["1M", "3M", "6M", "1Y", "2Y"]);
  });
});

describe("priceDomain", () => {
  it("pads the extremes so the line does not touch the frame", () => {
    const [min, max] = priceDomain([100, 200]);

    expect(min).toBeLessThan(100);
    expect(max).toBeGreaterThan(200);
  });

  it("pads proportionally to the range, not to the price", () => {
    // A stock at $500 moving $2 must not get a $50 pad; the move would vanish.
    const [min, max] = priceDomain([498, 500]);

    expect(max - min).toBeLessThan(10);
  });

  it("gives a flat series a usable band instead of dividing by zero", () => {
    // Every close identical: a range of 0 makes the scale degenerate and
    // Recharts draws the line off the frame or not at all.
    const [min, max] = priceDomain([100, 100, 100]);

    expect(max).toBeGreaterThan(min);
    expect(min).toBeLessThan(100);
    expect(max).toBeGreaterThan(100);
  });

  it("survives a single close", () => {
    const [min, max] = priceDomain([42]);

    expect(max).toBeGreaterThan(min);
  });

  it("returns a unit band for no data rather than NaN", () => {
    const [min, max] = priceDomain([]);

    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(max).toBeGreaterThan(min);
  });

  it("never pads below zero", () => {
    // A penny stock's padded floor must not imply a negative price.
    const [min] = priceDomain([0.02, 0.03]);

    expect(min).toBeGreaterThanOrEqual(0);
  });
});

describe("windowChange", () => {
  it("measures first close to last close across the window", () => {
    const change = windowChange(bars(["2026-08-01", 100], ["2026-08-31", 120]));

    expect(change?.percent).toBeCloseTo(20, 10);
    expect(change?.direction).toBe("up");
  });

  it("reports a fall as down", () => {
    const change = windowChange(bars(["2026-08-01", 100], ["2026-08-31", 90]));

    expect(change?.percent).toBeCloseTo(-10, 10);
    expect(change?.direction).toBe("down");
  });

  it("calls an unchanged window flat rather than up", () => {
    // `>= 0 ? "up" : "down"` paints a flat window green. Direction is a claim
    // about observed movement, and "no movement" is a third answer.
    const change = windowChange(bars(["2026-08-01", 100], ["2026-08-31", 100]));

    expect(change?.direction).toBe("flat");
    expect(change?.percent).toBe(0);
  });

  it("returns null on a single bar instead of a fabricated 0%", () => {
    expect(windowChange(bars(["2026-08-31", 100]))).toBeNull();
  });

  it("returns null on an empty window", () => {
    expect(windowChange([])).toBeNull();
  });

  it("does not assume the series is contiguous", () => {
    // A two-week gap from a missed cron run is a real two-week move, not an
    // error and not a daily one.
    const change = windowChange(bars(["2026-08-14", 100], ["2026-08-28", 110]));

    expect(change?.percent).toBeCloseTo(10, 10);
  });
});

describe("availableRanges", () => {
  it("offers only ranges the history can nearly fill, plus one to see it all", () => {
    // Six weeks held: 1M is real, 3M is the button that shows everything
    // there is. Offering 1Y as well would draw six weeks of line across a
    // year-wide frame and imply the rest is missing rather than unfetched.
    const series = bars(["2026-07-18", 100], ["2026-08-31", 120]);

    expect(availableRanges(series)).toEqual(["1M", "3M"]);
  });

  it("offers every range once two years are held", () => {
    const series = bars(["2024-08-31", 100], ["2026-08-31", 120]);

    expect(availableRanges(series)).toEqual(["1M", "3M", "6M", "1Y", "2Y"]);
  });

  it("offers the shortest range when barely any history exists", () => {
    // Ten days is not a month, but the chart still has something true to
    // draw, and one button is clearer than none.
    const series = bars(["2026-08-21", 100], ["2026-08-31", 120]);

    expect(availableRanges(series)).toEqual(["1M"]);
  });

  it("offers nothing at all for no history", () => {
    // The caller renders an empty state instead of a frame with no line.
    expect(availableRanges([])).toEqual([]);
  });
});
