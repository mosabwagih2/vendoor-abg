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
