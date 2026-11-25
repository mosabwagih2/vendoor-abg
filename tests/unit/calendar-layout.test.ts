import { describe, expect, it } from "vitest";
import { layoutWeek, monthWeeks, oneWeek, stepAnchor } from "@/domain/calendar-layout";

describe("monthWeeks", () => {
  it("starts on a Saturday and ends on a Friday", () => {
    const weeks = monthWeeks("2026-11-15");
    expect(weeks[0][0].key).toBe("2026-10-31"); // Saturday before Nov 1 (Sunday)
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[weeks.length - 1][6].key).toBe("2026-12-04");
  });
  it("marks Friday as the day off", () => {
    const week = oneWeek("2026-11-25")[0];
    expect(week.map((d) => d.isDayOff)).toEqual([false, false, false, false, false, false, true]);
    expect(week[6].key).toBe("2026-11-27");
  });
});

describe("layoutWeek", () => {
  const days = oneWeek("2026-11-25")[0].map((d) => d.key); // Nov 21 (Sat) .. Nov 27 (Fri)
  it("clips a bar that starts earlier and flags the cut", () => {
    const [s] = layoutWeek(days, [{ id: "a", start: "2026-11-18", end: "2026-11-23" }]);
    expect(s).toMatchObject({ col: 0, span: 3, cutLeft: true, cutRight: false });
  });
  it("clips a bar that continues into the next week", () => {
    const [s] = layoutWeek(days, [{ id: "a", start: "2026-11-25", end: "2026-12-02" }]);
    expect(s).toMatchObject({ col: 4, span: 3, cutLeft: false, cutRight: true });
  });
  it("drops bars outside the week", () => expect(layoutWeek(days, [{ id: "a", start: "2026-12-10", end: "2026-12-12" }])).toEqual([]));
  it("stacks overlapping bars and reuses a row when there is room", () => {
    const segs = layoutWeek(days, [
      { id: "a", start: "2026-11-21", end: "2026-11-24" },
      { id: "b", start: "2026-11-23", end: "2026-11-25" },
      { id: "c", start: "2026-11-25", end: "2026-11-26" },
    ]);
    const row = Object.fromEntries(segs.map((s) => [s.id, s.row]));
    expect(row).toEqual({ a: 0, b: 1, c: 0 });
  });
});

describe("stepAnchor", () => {
  it("moves months across the year end", () => {
    expect(stepAnchor("2026-12-10", "month", 1)).toBe("2027-01-01");
    expect(stepAnchor("2026-01-10", "month", -1)).toBe("2025-12-01");
  });
  it("moves weeks", () => expect(stepAnchor("2026-11-25", "week", -1)).toBe("2026-11-18"));
});
