import { describe, expect, it } from "vitest";
import { clockLabel, dueWeeklySend, type ScheduleInput } from "@/domain/weekly-schedule";

const base: ScheduleInput = { localDate: "2026-11-26", localMinutes: 17 * 60, endMin: 17 * 60, enabled: true, lastSentWeek: null }; // Thursday 5 PM

describe("dueWeeklySend", () => {
  it("sends on Thursday when the work day ends", () => expect(dueWeeklySend(base)).toBe("2026-11-21"));
  it("waits until the work day ends", () => expect(dueWeeklySend({ ...base, localMinutes: 16 * 60 + 59 })).toBeNull());
  it("sends only once per week", () => expect(dueWeeklySend({ ...base, lastSentWeek: "2026-11-21" })).toBeNull());
  it("catches up on Friday", () => expect(dueWeeklySend({ ...base, localDate: "2026-11-27", localMinutes: 9 * 60 })).toBe("2026-11-21"));
  it("does not send late once the next week begins", () => {
    expect(dueWeeklySend({ ...base, localDate: "2026-11-28", localMinutes: 18 * 60 })).toBeNull(); // Saturday
    expect(dueWeeklySend({ ...base, localDate: "2026-11-25" })).toBeNull(); // Wednesday
  });
  it("does nothing when switched off", () => expect(dueWeeklySend({ ...base, enabled: false })).toBeNull());
  it("sends the next week's report a week later", () => expect(dueWeeklySend({ ...base, localDate: "2026-12-03", lastSentWeek: "2026-11-21" })).toBe("2026-11-28"));
});

describe("clockLabel", () => {
  it("formats 12-hour times", () => {
    expect(clockLabel(17 * 60)).toBe("5:00 PM");
    expect(clockLabel(9 * 60 + 30)).toBe("9:30 AM");
    expect(clockLabel(0)).toBe("12:00 AM");
    expect(clockLabel(12 * 60)).toBe("12:00 PM");
  });
});
