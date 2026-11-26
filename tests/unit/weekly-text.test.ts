import { describe, expect, it } from "vitest";
import { weekRangeLabel, weeklyText, weekTitle, type WeeklySummary } from "@/domain/weekly-text";

const base: WeeklySummary = { start: "2026-11-21", end: "2026-11-26", completed: 14, verified: 4, releases: [{ number: "R-2026-11-22", taskCount: 6 }], cameBackBroken: [], waitingCheck: [], asks: [] };

describe("weeklyText", () => {
  it("labels the range", () => {
    expect(weekRangeLabel("2026-11-21", "2026-11-26")).toBe("Nov 21 – 26");
    expect(weekRangeLabel("2026-11-28", "2026-12-03")).toBe("Nov 28 – Dec 3");
  });
  it("writes the headline with release and verified counts", () => {
    const t = weeklyText(base);
    expect(t).toContain("Weekly report · Nov 21 – 26");
    expect(t).toContain("ABG completed 14 tasks, 1 release (R-2026-11-22).");
    expect(t).toContain("We verified 4.");
  });
  it("says when nothing was released or completed", () => {
    expect(weeklyText({ ...base, completed: 1, releases: [] })).toContain("ABG completed 1 task, no release.");
  });
  it("lists what came back broken with the repeat count", () => {
    const t = weeklyText({ ...base, cameBackBroken: [{ key: "VEN-30", title: "Thermal waybill", times: 2 }, { key: "VEN-08", title: "Bosta notes", times: 1 }] });
    expect(t).toContain("2 came back broken.");
    expect(t).toContain("VEN-30 Thermal waybill (2nd time)");
    expect(t).toContain("VEN-08 Bosta notes");
  });
  it("adds waiting and asks sections only when there is something", () => {
    expect(weeklyText(base)).not.toContain("Our asks");
    const t = weeklyText({ ...base, waitingCheck: ["VEN-37", "VEN-27"], asks: [{ key: "VEN-30", title: "Fix, not explain" }] });
    expect(t).toContain("VEN-37 · VEN-27");
    expect(t).toContain("1. Fix, not explain (VEN-30)");
  });
  it("names the week", () => expect(weekTitle("2026-11-21")).toBe("Week 48"));
});
