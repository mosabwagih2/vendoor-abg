import { describe, expect, it } from "vitest";
import { addWorkingMinutes, computeClock, DEFAULT_CALENDAR, workingMinutesBetween, type WorkCalendar } from "@/domain/sla";

// Cairo is UTC+2 in winter and UTC+3 in summer (DST since 2023).
const cairo = (iso: string) => new Date(iso); // ISO strings below carry explicit offsets
const cal: WorkCalendar = { ...DEFAULT_CALENDAR, holidays: ["2026-12-03"] };
const iso = (d: Date | null) => d?.toISOString();

describe("addWorkingMinutes", () => {
  it("inside working hours", () => {
    // Sun 29 Nov 2026 11:00 Cairo (+02:00) + 60 min = 12:00
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-29T11:00:00+02:00"), 60))).toBe("2026-11-29T10:00:00.000Z");
  });
  it("before opening starts at 10:00", () => {
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-29T07:30:00+02:00"), 30))).toBe("2026-11-29T08:30:00.000Z");
  });
  it("after hours rolls to next working day", () => {
    // Sun 18:30 + 60 → Mon 11:00
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-29T18:30:00+02:00"), 60))).toBe("2026-11-30T09:00:00.000Z");
  });
  it("Thursday afternoon skips Friday and Saturday", () => {
    // Thu 26 Nov 17:00 + 120 → 60 min Thu, 60 min Sun 29 Nov → 11:00
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-26T17:00:00+02:00"), 120))).toBe("2026-11-29T09:00:00.000Z");
  });
  it("Friday filing starts the clock on Sunday 10:00", () => {
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-27T13:00:00+02:00"), 60))).toBe("2026-11-29T09:00:00.000Z");
  });
  it("skips holidays", () => {
    // Wed 2 Dec 17:00 + 120 → 60 Wed, Thu 3 Dec holiday, Sun 6 Dec 11:00
    expect(iso(addWorkingMinutes(cal, cairo("2026-12-02T17:00:00+02:00"), 120))).toBe("2026-12-06T09:00:00.000Z");
  });
  it("exact end of day lands on 18:00", () => {
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-29T10:00:00+02:00"), 480))).toBe("2026-11-29T16:00:00.000Z");
  });
  it("1 working day from Thursday 12:00 is Sunday 12:00", () => {
    expect(iso(addWorkingMinutes(cal, cairo("2026-11-26T12:00:00+02:00"), 480))).toBe("2026-11-29T10:00:00.000Z");
  });
  it("is DST-safe: spring forward (Fri 24 Apr 2026) does not shift working hours", () => {
    // Thu 23 Apr 17:00 (+02:00) + 120 → Sun 26 Apr 11:00 (+03:00)
    expect(iso(addWorkingMinutes(cal, cairo("2026-04-23T17:00:00+02:00"), 120))).toBe("2026-04-26T08:00:00.000Z");
  });
  it("is DST-safe: fall back (end of Thu 29 Oct 2026)", () => {
    // Thu 29 Oct 17:00 (+03:00) + 120 → Sun 1 Nov 11:00 (+02:00)
    expect(iso(addWorkingMinutes(cal, cairo("2026-10-29T17:00:00+03:00"), 120))).toBe("2026-11-01T09:00:00.000Z");
  });
  it("supports a season with shorter hours (Ramadan)", () => {
    const ramadan: WorkCalendar = { ...cal, seasons: [{ start: "2027-02-08", end: "2027-03-09", startMin: 600, endMin: 900 }] };
    // Sun 14 Feb 2027 14:00 + 120 → 60 min to 15:00, then Mon 15 Feb 11:00
    expect(iso(addWorkingMinutes(ramadan, cairo("2027-02-14T14:00:00+02:00"), 120))).toBe("2027-02-15T09:00:00.000Z");
  });
});

describe("workingMinutesBetween", () => {
  it("counts only working time across a weekend", () => {
    expect(workingMinutesBetween(cal, cairo("2026-11-26T17:00:00+02:00"), cairo("2026-11-29T11:00:00+02:00"))).toBe(120);
  });
  it("excludes Needs info pauses", () => {
    const pauses = [{ start: cairo("2026-11-29T12:00:00+02:00"), end: cairo("2026-11-29T15:00:00+02:00") }];
    expect(workingMinutesBetween(cal, cairo("2026-11-29T10:00:00+02:00"), cairo("2026-11-29T18:00:00+02:00"), pauses)).toBe(300);
  });
});

describe("computeClock (PRD 4.3)", () => {
  const start = cairo("2026-11-29T10:00:00+02:00");
  it("Urgent first response: 1 working hour, at risk with 25% left", () => {
    const c = computeClock({ calendar: cal, targetMinutes: 60, clockStart: start, pauses: [], completedAt: null, now: cairo("2026-11-29T10:50:00+02:00") });
    expect(c.state).toBe("at_risk");
    expect(c.remainingMinutes).toBe(10);
    expect(iso(c.dueAt)).toBe("2026-11-29T09:00:00.000Z");
  });
  it("breached after the due time", () => {
    const c = computeClock({ calendar: cal, targetMinutes: 60, clockStart: start, pauses: [], completedAt: null, now: cairo("2026-11-29T11:30:00+02:00") });
    expect(c.state).toBe("breached");
  });
  it("paused while in Needs info; due date shifts by the paused working time", () => {
    const pauses = [{ start: cairo("2026-11-29T10:30:00+02:00"), end: null }];
    const paused = computeClock({ calendar: cal, targetMinutes: 480, clockStart: start, pauses, completedAt: null, now: cairo("2026-11-30T12:00:00+02:00") });
    expect(paused.state).toBe("paused");
    expect(paused.remainingMinutes).toBe(450);
    // Answered Monday 12:00 → 450 minutes remain → Tue 1 Dec 11:30
    const resumed = computeClock({
      calendar: cal,
      targetMinutes: 480,
      clockStart: start,
      pauses: [{ start: pauses[0].start, end: cairo("2026-11-30T12:00:00+02:00") }],
      completedAt: null,
      now: cairo("2026-11-30T12:00:00+02:00"),
    });
    expect(iso(resumed.dueAt)).toBe("2026-12-01T09:30:00.000Z");
    expect(resumed.state).toBe("ok");
  });
  it("Needs info pause across a weekend does not count", () => {
    const pauses = [{ start: cairo("2026-11-26T12:00:00+02:00"), end: cairo("2026-11-29T12:00:00+02:00") }];
    const c = computeClock({ calendar: cal, targetMinutes: 240, clockStart: cairo("2026-11-26T10:00:00+02:00"), pauses, completedAt: null, now: cairo("2026-11-29T12:00:00+02:00") });
    expect(c.remainingMinutes).toBe(120);
    expect(iso(c.dueAt)).toBe("2026-11-29T12:00:00.000Z");
  });
  it("met when completed within target", () => {
    const c = computeClock({ calendar: cal, targetMinutes: 60, clockStart: start, pauses: [], completedAt: cairo("2026-11-29T10:45:00+02:00"), now: new Date() });
    expect(c.state).toBe("met");
  });
  it("Low priority has no resolution target", () => {
    expect(computeClock({ calendar: cal, targetMinutes: null, clockStart: start, pauses: [], completedAt: null, now: start }).state).toBe("none");
  });
  it("reopen continues the original clock (shipped time is paused)", () => {
    const pauses = [{ start: cairo("2026-11-29T12:00:00+02:00"), end: cairo("2026-11-30T12:00:00+02:00") }];
    const c = computeClock({ calendar: cal, targetMinutes: 480, clockStart: start, pauses, completedAt: null, now: cairo("2026-11-30T13:00:00+02:00") });
    expect(c.remainingMinutes).toBe(480 - 120 - 60);
  });
});
