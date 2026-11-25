import { describe, expect, it } from "vitest";
import { PX_PER_DAY, barBox, daysBetween, fridayOffsets, monthMarks, visibleRange } from "@/domain/timeline";

describe("timeline", () => {
  it("counts days between keys", () => expect(daysBetween("2026-11-01", "2026-11-30")).toBe(29));
  it("shows whole months and at least 90 days", () => {
    const r = visibleRange([{ start: "2026-11-10", end: "2026-11-20" }], "2026-11-25");
    expect(r.start).toBe("2026-11-01");
    expect(daysBetween(r.start, r.end)).toBeGreaterThanOrEqual(90);
  });
  it("stretches to cover data far in the future", () => {
    const r = visibleRange([{ start: "2026-11-10", end: "2027-03-15" }], "2026-11-25");
    expect(r.end >= "2027-03-15").toBe(true);
  });
  it("places a bar by days from the start", () => {
    const px = PX_PER_DAY.months;
    expect(barBox({ start: "2026-11-01", end: "2027-02-01" }, { start: "2026-11-11", end: "2026-11-20" }, "months")).toEqual({ left: 10 * px, width: 10 * px });
  });
  it("keeps one-day and reversed bars visible", () => {
    expect(barBox({ start: "2026-11-01", end: "2027-02-01" }, { start: "2026-11-05", end: "2026-11-05" }, "weeks").width).toBe(PX_PER_DAY.weeks);
  });
  it("splits the header by month", () => {
    const marks = monthMarks({ start: "2026-11-01", end: "2027-01-01" }, "months");
    expect(marks.map((m) => m.label)).toEqual(["November", "December"]);
    expect(marks[1].left).toBe(30 * PX_PER_DAY.months);
  });
  it("finds Fridays", () => {
    const f = fridayOffsets({ start: "2026-11-01", end: "2026-11-15" }, "weeks");
    expect(f).toEqual([5 * PX_PER_DAY.weeks, 12 * PX_PER_DAY.weeks]); // Nov 6 and Nov 13
  });
});
