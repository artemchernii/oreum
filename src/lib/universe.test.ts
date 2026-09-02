import { describe, expect, it } from "vitest";
import { ingestionSymbols, isCompany } from "@/lib/universe";

// The rows as they come back from `companies`: 25 companies plus the
// benchmark ETFs that ride the same ingestion.
const rows = [
  { symbol: "AAPL", kind: "company" },
  { symbol: "NVDA", kind: "company" },
  { symbol: "SPY", kind: "benchmark" },
  { symbol: "QQQ", kind: "benchmark" },
];

describe("ingestionSymbols", () => {
  it("keeps benchmark rows", () => {
    // The reason this function exists as a named, tested thing: benchmarks
    // arrive free in the grouped-daily response, and a well-meaning "filter
    // to the universe" fix that drops them would silently kill every
    // relative-performance feature downstream.
    const symbols = ingestionSymbols(rows);

    expect(symbols.has("SPY")).toBe(true);
    expect(symbols.has("QQQ")).toBe(true);
  });

  it("keeps company rows", () => {
    const symbols = ingestionSymbols(rows);

    expect(symbols.has("AAPL")).toBe(true);
    expect(symbols.has("NVDA")).toBe(true);
    expect(symbols.size).toBe(4);
  });

  it("returns an empty set for no rows rather than throwing", () => {
    expect(ingestionSymbols([]).size).toBe(0);
  });
});

describe("isCompany", () => {
  it("accepts a company row", () => {
    expect(isCompany({ kind: "company" })).toBe(true);
  });

  it("rejects a benchmark row", () => {
    // Benchmarks are calibration data. They must never surface in the
    // watchlist or the universe picker, however they got into a query result.
    expect(isCompany({ kind: "benchmark" })).toBe(false);
  });
});
