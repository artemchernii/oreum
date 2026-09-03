import { describe, expect, it } from "vitest";
import {
  evaluate,
  formatPool,
  matchesFilter,
  mergePool,
  parseEntry,
  parsePool,
  stableSample,
  type Candidate,
  type PoolRow,
} from "@/lib/evaluation";

/** A pool row with everything unstated defaulted to something inert. */
function row(overrides: Partial<PoolRow> = {}): PoolRow {
  return {
    symbol: "AMD",
    date: "2026-01-05",
    kind: "company",
    reason: "price",
    change: 0.1,
    volatilityAdjusted: 4,
    relativeAdjusted: 3,
    volume: 5,
    verdict: "",
    basis: "",
    labeledAt: "",
    ...overrides,
  };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  const { verdict, basis, labeledAt, ...rest } = row(overrides as Partial<PoolRow>);
  void verdict;
  void basis;
  void labeledAt;
  return rest;
}

describe("evaluate", () => {
  it("ignores unlabeled rows entirely", () => {
    // An unlabeled row is not a negative. Counting it as one would make
    // precision fall every time the pool grows, which is the opposite of
    // what labeling more data should do.
    const result = evaluate([
      { verdict: "yes", fired: true },
      { verdict: "", fired: true },
      { verdict: "", fired: false },
    ]);

    expect(result.labeled).toBe(1);
    expect(result.precision).toBe(1);
    expect(result.recall).toBe(1);
  });

  it("counts a wanted day the rule missed against recall", () => {
    const result = evaluate([
      { verdict: "yes", fired: true },
      { verdict: "yes", fired: false },
    ]);

    expect(result.recall).toBeCloseTo(0.5, 12);
  });

  it("counts an unwanted day the rule fired on against precision", () => {
    const result = evaluate([
      { verdict: "yes", fired: true },
      { verdict: "no", fired: true },
      { verdict: "no", fired: true },
    ]);

    expect(result.precision).toBeCloseTo(1 / 3, 12);
  });

  it("treats major as wanted and also reports it on its own", () => {
    // A missed major event is the catastrophic failure, so it needs a
    // number that a pile of correct minor calls cannot dilute.
    const result = evaluate([
      { verdict: "major", fired: false },
      { verdict: "yes", fired: true },
      { verdict: "yes", fired: true },
    ]);

    expect(result.recall).toBeCloseTo(2 / 3, 12);
    expect(result.majorRecall).toBe(0);
  });

  it("reports null rather than zero when nothing was wanted", () => {
    // Zero recall would read as total failure; the honest answer is that
    // the question has no denominator yet.
    const result = evaluate([{ verdict: "no", fired: true }]);

    expect(result.recall).toBeNull();
    expect(result.majorRecall).toBeNull();
    expect(result.precision).toBe(0);
  });

  it("reports null precision when the rule fired on nothing labeled", () => {
    const result = evaluate([{ verdict: "yes", fired: false }]);

    expect(result.precision).toBeNull();
  });
});

describe("mergePool", () => {
  it("keeps a human label when the measurements are recomputed", () => {
    // Bars are adjusted, so a split restates history and every measurement
    // moves. The judgment does not: dropping it would silently delete work
    // that took hours and cannot be regenerated.
    const existing = [
      row({ verdict: "major", basis: "earnings blowup", labeledAt: "2026-09-03T10:00:00Z" }),
    ];
    const fresh = [candidate({ volatilityAdjusted: 4.4, change: 0.12 })];

    const [merged] = mergePool(existing, fresh);

    expect(merged.verdict).toBe("major");
    expect(merged.basis).toBe("earnings blowup");
    expect(merged.labeledAt).toBe("2026-09-03T10:00:00Z");
    expect(merged.volatilityAdjusted).toBe(4.4);
    expect(merged.change).toBeCloseTo(0.12, 12);
  });

  it("retires a labeled row that is no longer a candidate rather than deleting it", () => {
    const existing = [
      row({ symbol: "ORCL", verdict: "yes", basis: "kept", labeledAt: "2026-09-03T10:00:00Z" }),
    ];

    const merged = mergePool(existing, [candidate({ symbol: "AMD" })]);

    const retired = merged.find((entry) => entry.symbol === "ORCL");
    expect(retired?.verdict).toBe("yes");
    expect(retired?.reason).toBe("retired");
  });

  it("drops an unlabeled row that is no longer a candidate", () => {
    const merged = mergePool([row({ symbol: "ORCL" })], [candidate({ symbol: "AMD" })]);

    expect(merged.map((entry) => entry.symbol)).toEqual(["AMD"]);
  });

  it("orders by date then symbol so a refresh produces a readable diff", () => {
    const merged = mergePool(
      [],
      [
        candidate({ symbol: "ORCL", date: "2026-01-06" }),
        candidate({ symbol: "AMD", date: "2026-01-06" }),
        candidate({ symbol: "ZS", date: "2026-01-05" }),
      ],
    );

    expect(merged.map((entry) => `${entry.date} ${entry.symbol}`)).toEqual([
      "2026-01-05 ZS",
      "2026-01-06 AMD",
      "2026-01-06 ORCL",
    ]);
  });

  it("distinguishes two symbols on the same date", () => {
    const existing = [row({ symbol: "AMD", verdict: "yes" })];

    const merged = mergePool(existing, [
      candidate({ symbol: "AMD" }),
      candidate({ symbol: "NVDA" }),
    ]);

    expect(merged.find((entry) => entry.symbol === "AMD")?.verdict).toBe("yes");
    expect(merged.find((entry) => entry.symbol === "NVDA")?.verdict).toBe("");
  });
});

describe("parsePool and formatPool", () => {
  it("round-trips a labeled row", () => {
    const original = [
      row({ verdict: "major", basis: "guidance cut", labeledAt: "2026-09-03T10:00:00Z" }),
    ];

    expect(parsePool(formatPool(original))).toEqual(original);
  });

  it("round-trips a null measurement as null rather than zero", () => {
    // Null means the benchmark had no bar. Zero means the move exactly
    // matched its benchmark. Collapsing the two invents a measurement.
    const original = [row({ relativeAdjusted: null, volume: null })];

    const [parsed] = parsePool(formatPool(original));

    expect(parsed.relativeAdjusted).toBeNull();
    expect(parsed.volume).toBeNull();
  });

  it("strips a tab from free text so one basis cannot become two columns", () => {
    const text = formatPool([row({ basis: "split\tacross" })]);

    expect(parsePool(text)[0].basis).toBe("split across");
  });

  it("reads an empty file as no rows", () => {
    expect(parsePool("")).toEqual([]);
  });

  it("rejects a row whose verdict is not one of the three words", () => {
    const text = formatPool([row()]).replace("\t\t", "\tmaybe\t");

    expect(() => parsePool(text)).toThrow(/verdict/i);
  });
});

describe("stableSample", () => {
  const universe = Array.from({ length: 200 }, (_, index) => ({
    symbol: index % 2 === 0 ? "AMD" : "NVDA",
    date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    index,
  }));

  it("picks the same rows however the input is ordered", () => {
    // The control sample is labeled by hand. If a refresh reshuffled it, every
    // run would retire the rows somebody just judged and ask for new ones.
    const shuffled = [...universe].reverse();

    const a = stableSample(universe, 20).map((row) => `${row.date}|${row.symbol}`);
    const b = stableSample(shuffled, 20).map((row) => `${row.date}|${row.symbol}`);

    expect(a).toEqual(b);
  });

  it("keeps the rows it already picked when the pool grows", () => {
    const before = stableSample(universe.slice(0, 100), 10);
    const after = stableSample(universe, 10);

    const survivors = before.filter((row) =>
      after.some((other) => other.date === row.date && other.symbol === row.symbol),
    );

    expect(survivors.length).toBeGreaterThan(0);
  });

  it("returns everything when asked for more than it holds", () => {
    expect(stableSample(universe.slice(0, 3), 10)).toHaveLength(3);
  });

  it("returns nothing for a size of zero", () => {
    expect(stableSample(universe, 0)).toEqual([]);
  });
});

describe("parseEntry", () => {
  it("reads a verdict letter followed by the reason", () => {
    expect(parseEntry("y big earnings move")).toEqual({
      verdict: "yes",
      basis: "big earnings move",
    });
  });

  it("accepts the whole word as well as the letter", () => {
    expect(parseEntry("major huge")).toEqual({ verdict: "major", basis: "huge" });
    expect(parseEntry("m huge")).toEqual({ verdict: "major", basis: "huge" });
  });

  it("allows a verdict with no reason", () => {
    expect(parseEntry("n")).toEqual({ verdict: "no", basis: "" });
  });

  it("does not care about case or padding", () => {
    expect(parseEntry("  Y   Big Move  ")).toEqual({
      verdict: "yes",
      basis: "Big Move",
    });
  });

  it("recognizes the two control words", () => {
    expect(parseEntry("s")).toBe("skip");
    expect(parseEntry("q")).toBe("quit");
  });

  it("returns null for anything it does not understand", () => {
    // Null means re-prompt. Guessing a verdict from a typo would write a
    // judgment the person never made.
    expect(parseEntry("")).toBeNull();
    expect(parseEntry("maybe later")).toBeNull();
    expect(parseEntry("x")).toBeNull();
  });

  it("does not mistake a reason beginning with a verdict word for a skip", () => {
    expect(parseEntry("n nothing special")).toEqual({
      verdict: "no",
      basis: "nothing special",
    });
  });
});

describe("matchesFilter", () => {
  const row = { symbol: "MRVL", date: "2024-12-04" };

  it("matches a symbol whatever the case", () => {
    expect(matchesFilter(row, ["mrvl"])).toBe(true);
    expect(matchesFilter(row, ["MRVL"])).toBe(true);
    expect(matchesFilter(row, ["AMD"])).toBe(false);
  });

  it("matches an exact date", () => {
    expect(matchesFilter(row, ["2024-12-04"])).toBe(true);
    expect(matchesFilter(row, ["2024-12-05"])).toBe(false);
  });

  it("matches a partial date as a prefix", () => {
    expect(matchesFilter(row, ["2024-12"])).toBe(true);
    expect(matchesFilter(row, ["2024"])).toBe(true);
    expect(matchesFilter(row, ["2024-11"])).toBe(false);
  });

  it("matches an inclusive date range", () => {
    // The reason this exists: re-judging a block of sessions that were
    // labeled under an older definition.
    expect(matchesFilter(row, ["2024-11-27..2024-12-12"])).toBe(true);
    expect(matchesFilter(row, ["2024-12-04..2024-12-04"])).toBe(true);
    expect(matchesFilter(row, ["2024-12-05..2024-12-12"])).toBe(false);
    expect(matchesFilter(row, ["2024-11-01..2024-12-03"])).toBe(false);
  });

  it("matches when any one filter matches", () => {
    expect(matchesFilter(row, ["AMD", "2024-12-04"])).toBe(true);
    expect(matchesFilter(row, ["AMD", "INTC"])).toBe(false);
  });

  it("matches nothing when given nothing", () => {
    expect(matchesFilter(row, [])).toBe(false);
  });
});
