import { describe, expect, it } from "vitest";
import { formatTradeDate } from "@/lib/format";

describe("formatTradeDate", () => {
  it("formats as weekday, day, month", () => {
    expect(formatTradeDate("2026-08-28")).toBe("Fri 28 Aug");
  });

  it("does not shift the date for viewers west of UTC", () => {
    // The bug this guards: `new Date("2026-08-28")` is UTC midnight, so
    // formatting in a negative-offset zone renders the 27th. A trade date is
    // a calendar date, not an instant.
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(formatTradeDate("2026-08-28")).toBe("Fri 28 Aug");
    } finally {
      process.env.TZ = original;
    }
  });
});
