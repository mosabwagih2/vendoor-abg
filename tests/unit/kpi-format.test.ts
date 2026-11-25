import { describe, expect, it } from "vitest";
import { formatCountDelta, formatDays, formatDelta, formatMinutes } from "@/domain/kpi-format";

describe("kpi formatting", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(24)).toBe("24 min");
    expect(formatMinutes(90)).toBe("1.5 h");
    expect(formatMinutes(null)).toBe("—");
  });
  it("formats days", () => {
    expect(formatDays(2.44)).toBe("2.4 days");
    expect(formatDays(null)).toBe("—");
  });
  it("computes percent deltas", () => {
    expect(formatDelta(112, 100)).toEqual({ text: "+12%", direction: "up" });
    expect(formatDelta(94, 100)).toEqual({ text: "−6%", direction: "down" });
    expect(formatDelta(5, 5)).toEqual({ text: "same", direction: "same" });
  });
  it("has no percent against zero or missing", () => {
    expect(formatDelta(3, 0)).toBeNull();
    expect(formatDelta(null, 4)).toBeNull();
    expect(formatDelta(0, 0)).toEqual({ text: "same", direction: "same" });
  });
  it("computes count deltas", () => {
    expect(formatCountDelta(4, 3)).toEqual({ text: "+1", direction: "up" });
    expect(formatCountDelta(1, 3)).toEqual({ text: "−2", direction: "down" });
  });
});
