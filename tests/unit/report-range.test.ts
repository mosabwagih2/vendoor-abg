import { describe, expect, it } from "vitest";
import { bucketsFor, parseRangeKind, rangeFor, rangeShortName, rangeTitle, shiftRange } from "@/domain/report-range";

describe("report ranges", () => {
  it("builds a month and the next day after it", () => {
    expect(rangeFor("month", "2026-11-15")).toEqual({ kind: "month", start: "2026-11-01", end: "2026-12-01" });
    expect(rangeFor("month", "2026-12-31").end).toBe("2027-01-01");
  });
  it("builds a Saturday-start week", () => expect(rangeFor("week", "2026-11-25")).toEqual({ kind: "week", start: "2026-11-21", end: "2026-11-28" }));
  it("builds a day and a year", () => {
    expect(rangeFor("day", "2026-11-25")).toEqual({ kind: "day", start: "2026-11-25", end: "2026-11-26" });
    expect(rangeFor("year", "2026-06-01")).toEqual({ kind: "year", start: "2026-01-01", end: "2027-01-01" });
  });
  it("shifts across year boundaries", () => {
    expect(shiftRange(rangeFor("month", "2026-01-10"), -1).start).toBe("2025-12-01");
    expect(shiftRange(rangeFor("month", "2026-12-10"), 1).start).toBe("2027-01-01");
    expect(shiftRange(rangeFor("week", "2026-11-25"), -1).start).toBe("2026-11-14");
    expect(shiftRange(rangeFor("year", "2026-03-01"), -1).start).toBe("2025-01-01");
  });
  it("titles the range", () => {
    expect(rangeTitle(rangeFor("month", "2026-11-15"))).toBe("Nov 1 – Nov 30, 2026");
    expect(rangeShortName(rangeFor("month", "2026-10-02"))).toBe("Oct 2026");
  });
  it("defaults to month for unknown kinds", () => expect(parseRangeKind("zzz")).toBe("month"));
});

describe("chart buckets", () => {
  it("has 7 day bars for a week, starting Saturday", () => {
    const b = bucketsFor(rangeFor("week", "2026-11-25"));
    expect(b).toHaveLength(7);
    expect(b[0]).toMatchObject({ label: "Sat", start: "2026-11-21" });
  });
  it("covers a month with clipped weeks and no gaps", () => {
    const r = rangeFor("month", "2026-11-15");
    const b = bucketsFor(r);
    expect(b[0].start).toBe(r.start);
    expect(b[b.length - 1].end).toBe(r.end);
    for (let i = 1; i < b.length; i++) expect(b[i].start).toBe(b[i - 1].end);
  });
  it("has 12 months for a year and 24 hours for a day", () => {
    expect(bucketsFor(rangeFor("year", "2026-05-05"))).toHaveLength(12);
    expect(bucketsFor(rangeFor("day", "2026-05-05"))).toHaveLength(24);
  });
});
