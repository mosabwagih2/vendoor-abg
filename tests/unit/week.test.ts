import { describe, expect, it } from "vitest";
import { addDays, deltaVs, isoWeek, isWorkDay, nextWeek, previousWeek, weekRange, weekStart } from "@/domain/week";

describe("work week (Saturday to Thursday)", () => {
  // 2026-11-21 is a Saturday.
  it("starts on Saturday", () => {
    expect(weekStart("2026-11-21")).toBe("2026-11-21");
    expect(weekStart("2026-11-25")).toBe("2026-11-21"); // Wednesday
    expect(weekStart("2026-11-26")).toBe("2026-11-21"); // Thursday
  });
  it("puts Friday in the week that just ended", () => {
    expect(weekStart("2026-11-27")).toBe("2026-11-21");
    expect(weekStart("2026-11-28")).toBe("2026-11-28");
  });
  it("has six work days and Friday off", () => {
    const w = weekRange("2026-11-24");
    expect(w.start).toBe("2026-11-21");
    expect(w.end).toBe("2026-11-26");
    expect(w.workDays).toHaveLength(6);
    expect(w.days[6]).toBe("2026-11-27");
    expect(isWorkDay("2026-11-27", w.start)).toBe(false);
    expect(isWorkDay("2026-11-26", w.start)).toBe(true);
  });
  it("steps weeks and crosses month ends", () => {
    expect(previousWeek("2026-11-21")).toBe("2026-11-14");
    expect(nextWeek("2026-11-21")).toBe("2026-11-28");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
});

describe("deltaVs", () => {
  it("computes diff and percent", () => expect(deltaVs(12, 10)).toEqual({ diff: 2, pct: 20, direction: "up" }));
  it("handles a drop", () => expect(deltaVs(5, 10)).toEqual({ diff: -5, pct: -50, direction: "down" }));
  it("has no percent against zero", () => expect(deltaVs(3, 0)).toEqual({ diff: 3, pct: null, direction: "up" }));
  it("is same when equal", () => expect(deltaVs(0, 0).direction).toBe("same"));
});

describe("isoWeek", () => {
  it("numbers the week by its Thursday", () => {
    expect(isoWeek("2026-11-21")).toBe(48); // Thursday Nov 26 is in ISO week 48
    expect(isoWeek("2026-11-25")).toBe(48);
  });
  it("is week 1 when the Thursday is January 1", () => expect(isoWeek("2025-12-27")).toBe(1));
});
