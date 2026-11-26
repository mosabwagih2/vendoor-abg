import { describe, expect, it } from "vitest";
import { closingProblems, durationMinutes, formatDuration, nextStates } from "@/domain/incident";

describe("incident closing form", () => {
  it("flags every empty part", () => {
    expect(closingProblems({ summary: "", impact: " ", resolution: "ok" })).toEqual(["summary", "impact", "resolution"]);
  });
  it("passes when all three are written", () => {
    expect(closingProblems({ summary: "DB full", impact: "Orders stuck", resolution: "Freed disk" })).toEqual([]);
  });
});

describe("incident states", () => {
  it("never offers resolved (the closing form does that) or the current state", () => {
    expect(nextStates("investigating")).toEqual(["identified", "monitoring"]);
    expect(nextStates("monitoring")).toEqual(["investigating", "identified"]);
  });
  it("offers nothing once resolved", () => expect(nextStates("resolved")).toEqual([]));
});

describe("duration", () => {
  const t = new Date("2026-11-22T10:00:00Z");
  it("counts minutes and never goes negative", () => {
    expect(durationMinutes(t, new Date("2026-11-22T10:45:00Z"))).toBe(45);
    expect(durationMinutes(t, new Date("2026-11-22T09:00:00Z"))).toBe(0);
  });
  it("formats", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(130)).toBe("2 h 10 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(1620)).toBe("1 d 3 h");
  });
});

import { appendLink, incidentTitle, isSafeLink } from "@/domain/incident";

describe("reporting a problem", () => {
  it("titles each kind", () => {
    expect(incidentTitle("down")).toBe("System is down");
    expect(incidentTitle("slow")).toBe("System is slow");
    expect(incidentTitle("other")).toBe("System problem");
  });
  it("appends a link on its own line, once", () => {
    expect(appendLink("Nothing opens", "https://x.test/a")).toBe("Nothing opens\nhttps://x.test/a");
    expect(appendLink("see https://x.test/a", "https://x.test/a")).toBe("see https://x.test/a");
    expect(appendLink("", "https://x.test/a")).toBe("https://x.test/a");
  });
  it("accepts only http and https links", () => {
    expect(isSafeLink("https://x.test/a")).toBe(true);
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("not a url")).toBe(false);
  });
});

import { alertWaitMinutes, canAlertAgain } from "@/domain/incident";

describe("alert cooldown", () => {
  const last = new Date("2026-11-26T10:00:00Z");
  it("allows the first alert", () => expect(canAlertAgain(null, last)).toBe(true));
  it("blocks a second alert inside ten minutes", () => expect(canAlertAgain(last, new Date("2026-11-26T10:05:00Z"))).toBe(false));
  it("allows it at exactly ten minutes", () => expect(canAlertAgain(last, new Date("2026-11-26T10:10:00Z"))).toBe(true));
  it("says how long is left, rounded up", () => {
    expect(alertWaitMinutes(last, new Date("2026-11-26T10:07:30Z"))).toBe(3);
    expect(alertWaitMinutes(last, new Date("2026-11-26T10:11:00Z"))).toBe(0);
    expect(alertWaitMinutes(null, last)).toBe(0);
  });
});
