import { describe, expect, it } from "vitest";
import {
  dailyReturns,
  relativeReturn,
  rollingVolatility,
  volatilityAdjustedReturn,
  volumeRatio,
  observe,
  type ObservationBar,
} from "@/lib/observations";

/** Bars ascend by date. Volume defaults to a flat baseline when unstated. */
function bars(...entries: [string, number, number?][]): ObservationBar[] {
  return entries.map(([date, close, volume]) => ({
    date,
    close,
    volume: volume ?? 1_000_000,
  }));
}

describe("dailyReturns", () => {
  it("pairs each return with the date it was realized on", () => {
    // The return belongs to the later session. Stamping it with the earlier
    // date shifts every observation one session into the past, which would
    // make a replay claim the threshold fired the day before the move.
    const series = bars(["2026-01-02", 100], ["2026-01-05", 110]);

    const [only] = dailyReturns(series);

    expect(only.date).toBe("2026-01-05");
    // Compared with tolerance: 110 / 100 - 1 is 0.10000000000000009 in IEEE
    // 754, and an exact-equality assertion here tests the float format rather
    // than the arithmetic.
    expect(only.change).toBeCloseTo(0.1, 12);
  });

  it("returns nothing for a single bar", () => {
    expect(dailyReturns(bars(["2026-01-02", 100]))).toEqual([]);
  });

  it("computes across a calendar gap without inventing sessions", () => {
    // A market series is never contiguous — holidays, halts, and a provider
    // that simply missed a day all leave gaps. The return is between the bars
    // actually held, and the gap is not filled with a synthetic flat session.
    const series = bars(
      ["2026-01-02", 100],
      ["2026-03-02", 120], // two months later; still the next held bar
    );

    const [only] = dailyReturns(series);

    expect(only.date).toBe("2026-03-02");
    expect(only.change).toBeCloseTo(0.2, 12);
  });

  it("skips a bar whose previous close is zero rather than dividing by it", () => {
    const series = bars(["2026-01-02", 0], ["2026-01-05", 50]);

    expect(dailyReturns(series)).toEqual([]);
  });
});

describe("rollingVolatility", () => {
  it("is zero for a series that never moves", () => {
    const flat = [0, 0, 0, 0];

    expect(rollingVolatility(flat)).toBe(0);
  });

  it("uses the sample standard deviation, not the population one", () => {
    // n-1 in the denominator. With four returns the difference is 15%, which
    // is more than enough to move a borderline day across a threshold.
    const changes = [0.1, -0.1, 0.1, -0.1];

    // mean 0; sum of squares 0.04; sample variance 0.04/3.
    expect(rollingVolatility(changes)).toBeCloseTo(Math.sqrt(0.04 / 3), 12);
  });

  it("returns null when there are too few returns to have a spread", () => {
    // One observation has no dispersion. Reporting 0 would make every later
    // move infinitely significant, which is the opposite of the truth.
    expect(rollingVolatility([0.05])).toBeNull();
    expect(rollingVolatility([])).toBeNull();
  });
});

describe("volatilityAdjustedReturn", () => {
  it("expresses the move in units of the symbol's own volatility", () => {
    // 6% against a 2% daily volatility is a three-sigma day for this symbol.
    // The comparison is to its own history, never to the day's cross-section.
    expect(volatilityAdjustedReturn(0.06, 0.02)).toBeCloseTo(3, 12);
  });

  it("keeps the sign of the move", () => {
    expect(volatilityAdjustedReturn(-0.06, 0.02)).toBeCloseTo(-3, 12);
  });

  it("is null when volatility is zero or unknown", () => {
    // A symbol that has not moved has no scale to measure against. Dividing
    // would yield Infinity and fire the threshold on every such day.
    expect(volatilityAdjustedReturn(0.06, 0)).toBeNull();
    expect(volatilityAdjustedReturn(0.06, null)).toBeNull();
  });
});

describe("relativeReturn", () => {
  it("subtracts the benchmark move from the company move", () => {
    // A 3% day when the whole market is up 3% is not a company event.
    expect(relativeReturn(0.03, 0.03)).toBeCloseTo(0, 12);
    expect(relativeReturn(0.05, 0.01)).toBeCloseTo(0.04, 12);
  });

  it("is null when the benchmark has no bar for that date", () => {
    // Never silently treat a missing benchmark as a flat one: that would
    // convert a data gap into a fabricated relative-performance anomaly.
    expect(relativeReturn(0.05, null)).toBeNull();
  });
});

describe("volumeRatio", () => {
  it("measures volume against its own rolling baseline", () => {
    expect(volumeRatio(3_000_000, [1_000_000, 1_000_000, 1_000_000])).toBeCloseTo(3, 12);
  });

  it("uses the median so one earnings spike does not raise the baseline", () => {
    // A mean baseline is dragged up by the very spikes we are trying to
    // detect, which makes the next spike look ordinary.
    const baseline = [1_000_000, 1_000_000, 1_000_000, 9_000_000];

    // Median is 1M, not the 3M mean.
    expect(volumeRatio(2_000_000, baseline)).toBeCloseTo(2, 12);
  });

  it("is null when the baseline is empty or zero", () => {
    expect(volumeRatio(1_000_000, [])).toBeNull();
    expect(volumeRatio(1_000_000, [0, 0])).toBeNull();
  });
});

describe("observe", () => {
  const window = 3;

  it("produces nothing until the rolling window has warmed up", () => {
    // Two bars give one return, which has no spread. Emitting an observation
    // here would be an anomaly measured against no history at all.
    const series = bars(
      ["2026-01-02", 100],
      ["2026-01-05", 101],
      ["2026-01-06", 102],
    );

    expect(observe({ bars: series, window })).toEqual([]);
  });

  it("measures a bar against the window that precedes it, never itself", () => {
    // Including today's return in its own baseline inflates the denominator
    // exactly on the days that matter, damping every real spike.
    const series = bars(
      ["2026-01-02", 100],
      ["2026-01-05", 101],
      ["2026-01-06", 100],
      ["2026-01-07", 101],
      ["2026-01-08", 130], // the spike
    );

    const spike = observe({ bars: series, window }).at(-1);

    expect(spike?.date).toBe("2026-01-08");
    // Baseline is the three prior returns, which are all near 1%. The 29%
    // move must therefore land many sigma out, not near 1.
    expect(spike?.volatilityAdjusted ?? 0).toBeGreaterThan(10);
  });

  it("aligns the benchmark by date, not by position", () => {
    // The company and its benchmark can hold different session sets. Zipping
    // by index would compare Tuesday's company move to Monday's market move
    // and attribute the offset to the company.
    const company = bars(
      ["2026-01-02", 100],
      ["2026-01-05", 101],
      ["2026-01-06", 102],
      ["2026-01-07", 103],
      ["2026-01-08", 110],
    );
    const benchmark = bars(
      ["2026-01-02", 100],
      // no 2026-01-05 bar for the benchmark
      ["2026-01-06", 102],
      ["2026-01-07", 103],
      ["2026-01-08", 104],
    );

    const last = observe({ bars: company, benchmarkBars: benchmark, window }).at(-1);

    expect(last?.date).toBe("2026-01-08");
    // Company +6.796%, benchmark +0.971% on the same date.
    expect(last?.relative).toBeCloseTo(110 / 103 - 1 - (104 / 103 - 1), 12);
  });

  it("leaves relative null on a date the benchmark does not cover", () => {
    const company = bars(
      ["2026-01-02", 100],
      ["2026-01-05", 101],
      ["2026-01-06", 102],
      ["2026-01-07", 103],
      ["2026-01-08", 110],
    );
    const benchmark = bars(["2026-01-02", 100], ["2026-01-05", 101]);

    const last = observe({ bars: company, benchmarkBars: benchmark, window }).at(-1);

    expect(last?.relative).toBeNull();
  });
});
