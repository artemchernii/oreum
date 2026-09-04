import { describe, expect, it } from "vitest";
import {
  benchmarkFirst,
  both,
  flatOr,
  mag,
  percent,
  sigma,
  type Measured,
} from "@/lib/attention";

/** A measured session with everything unstated quiet. */
function row(overrides: Partial<Measured> = {}): Measured {
  return {
    kind: "company",
    change: 0.001,
    volatilityAdjusted: 0.1,
    relative: 0.001,
    relativeAdjusted: 0.1,
    volume: 1,
    ...overrides,
  };
}

describe("mag", () => {
  it("reads a missing measurement as no move rather than a large one", () => {
    expect(mag(null)).toBe(0);
  });

  it("ignores direction", () => {
    expect(mag(-3.2)).toBeCloseTo(3.2);
    expect(mag(3.2)).toBeCloseTo(3.2);
  });
});

describe("sigma", () => {
  it("fires on the volatility-adjusted move, in either direction", () => {
    expect(sigma(2.5).price(row({ volatilityAdjusted: 2.6 }))).toBe(true);
    expect(sigma(2.5).price(row({ volatilityAdjusted: -2.6 }))).toBe(true);
    expect(sigma(2.5).price(row({ volatilityAdjusted: 2.4 }))).toBe(false);
  });

  it("does not read the raw percentage", () => {
    expect(sigma(2.5).price(row({ change: 0.5, volatilityAdjusted: 1 }))).toBe(false);
  });

  it("reads the cohort-adjusted move for the relative family", () => {
    expect(sigma(2).relative(row({ relativeAdjusted: -3 }))).toBe(true);
    expect(sigma(2).relative(row({ relativeAdjusted: null }))).toBe(false);
  });
});

describe("percent", () => {
  it("fires on the raw move and ignores how unusual it is", () => {
    expect(percent(0.05).price(row({ change: 0.06, volatilityAdjusted: 0.2 }))).toBe(true);
    expect(percent(0.05).price(row({ change: -0.06 }))).toBe(true);
    expect(percent(0.05).price(row({ change: 0.04, volatilityAdjusted: 9 }))).toBe(false);
  });

  it("reads the unadjusted relative move for the relative family", () => {
    expect(percent(0.05).relative(row({ relative: -0.09, relativeAdjusted: 0.1 }))).toBe(true);
    expect(percent(0.05).relative(row({ relative: null }))).toBe(false);
  });
});

describe("both", () => {
  it("needs the move to be large in absolute terms and unusual for the symbol", () => {
    expect(both(0.04, 2).price(row({ change: 0.06, volatilityAdjusted: 2.5 }))).toBe(true);
  });

  it("rejects a large move that is ordinary for the symbol", () => {
    expect(both(0.04, 2).price(row({ change: 0.06, volatilityAdjusted: 1.2 }))).toBe(false);
  });

  it("rejects an unusual move that is small in absolute terms", () => {
    expect(both(0.04, 2).price(row({ change: 0.015, volatilityAdjusted: 3.5 }))).toBe(false);
  });

  it("compares each family against its own pair of measurements", () => {
    expect(both(0.04, 2).relative(row({ relative: -0.07, relativeAdjusted: -2.4 }))).toBe(true);
    expect(both(0.04, 2).relative(row({ relative: -0.07, relativeAdjusted: -1.1 }))).toBe(false);
    expect(both(0.04, 2).relative(row({ relative: null, relativeAdjusted: -4 }))).toBe(false);
  });
});

describe("flatOr", () => {
  const rule = flatOr(sigma(2));

  it("fires when either price family is big, whatever the symbol is", () => {
    expect(rule.fires(row({ volatilityAdjusted: 3 }))).toBe(true);
    expect(rule.fires(row({ relativeAdjusted: 3 }))).toBe(true);
    expect(rule.fires(row({ kind: "benchmark", volatilityAdjusted: 3 }))).toBe(true);
  });

  it("fires on the volume gate alone, for a benchmark as much as a company", () => {
    expect(rule.fires(row({ volume: 4 }))).toBe(true);
    expect(rule.fires(row({ kind: "benchmark", volume: 4 }))).toBe(true);
    expect(rule.fires(row({ volume: 3.9 }))).toBe(false);
  });

  it("stays silent on a quiet session", () => {
    expect(rule.fires(row())).toBe(false);
    expect(rule.fires(row({ volume: null }))).toBe(false);
  });

  it("names itself after the size it was given", () => {
    expect(rule.label).toBe("flat OR σ >= 2");
  });
});

describe("benchmarkFirst", () => {
  const rule = benchmarkFirst(sigma(2));

  it("lets a benchmark speak for itself on price", () => {
    expect(rule.fires(row({ kind: "benchmark", volatilityAdjusted: -3 }))).toBe(true);
  });

  it("does not let volume alone speak for a benchmark", () => {
    expect(rule.fires(row({ kind: "benchmark", volume: 9 }))).toBe(false);
  });

  it("makes a company beat its cohort rather than the market", () => {
    expect(rule.fires(row({ relativeAdjusted: 3 }))).toBe(true);
    expect(rule.fires(row({ volatilityAdjusted: 5, relativeAdjusted: 0.5 }))).toBe(false);
  });

  it("still lets volume speak for a company", () => {
    expect(rule.fires(row({ volume: 4 }))).toBe(true);
  });

  it("names itself after the size it was given", () => {
    expect(rule.label).toBe("benchmark σ >= 2");
  });
});

describe("labels", () => {
  it("prints a percentage as a percentage and a conjunction as both halves", () => {
    expect(flatOr(percent(0.05)).label).toBe("flat OR % >= 5");
    expect(benchmarkFirst(both(0.04, 2.5)).label).toBe("benchmark % >= 4 & σ >= 2.5");
  });
});
