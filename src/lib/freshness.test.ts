import { describe, expect, it } from "vitest";
import { isStale, tradeDateAgeDays } from "@/lib/freshness";

describe("tradeDateAgeDays", () => {
  it("is zero on the trade date itself", () => {
    expect(tradeDateAgeDays("2026-08-31", new Date("2026-08-31T12:00:00Z"))).toBe(
      0,
    );
  });

  it("is one the next day", () => {
    expect(tradeDateAgeDays("2026-08-31", new Date("2026-09-01T09:00:00Z"))).toBe(
      1,
    );
  });

  it("does not change with the hour the check runs", () => {
    // The trap: subtracting instants rather than calendar dates makes the
    // answer depend on when the health check happened to fire, so a cache
    // would flip between "3 days" and "4 days" over the course of a morning.
    const early = tradeDateAgeDays(
      "2026-08-28",
      new Date("2026-09-01T00:01:00Z"),
    );
    const late = tradeDateAgeDays(
      "2026-08-28",
      new Date("2026-09-01T23:59:00Z"),
    );

    expect(early).toBe(late);
    expect(early).toBe(4);
  });

  it("counts a normal weekend as three days", () => {
    // Friday's close read on Monday. This is the healthy case, and it is why
    // the threshold cannot be one.
    expect(tradeDateAgeDays("2026-08-28", new Date("2026-08-31T09:00:00Z"))).toBe(
      3,
    );
  });
});

describe("isStale", () => {
  it("tolerates a weekend", () => {
    expect(isStale(3)).toBe(false);
  });

  it("tolerates a long weekend with a holiday", () => {
    expect(isStale(4)).toBe(false);
  });

  it("flags anything older", () => {
    expect(isStale(5)).toBe(true);
  });

  it("treats an empty cache as stale rather than fresh", () => {
    // No rows at all is the most broken state there is; reporting it as
    // healthy because there is no date to compare would be the worst answer.
    expect(isStale(null)).toBe(true);
  });
});
