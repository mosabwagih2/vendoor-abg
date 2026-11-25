import { describe, expect, it } from "vitest";
import { dayBucket, groupByDay } from "@/domain/notification-groups";

const now = new Date("2026-11-25T10:00:00Z");

describe("notification day groups", () => {
  it("buckets by Cairo calendar day", () => {
    expect(dayBucket(new Date("2026-11-25T01:00:00Z"), now)).toBe("today");
    expect(dayBucket(new Date("2026-11-24T12:00:00Z"), now)).toBe("yesterday");
    expect(dayBucket(new Date("2026-11-20T12:00:00Z"), now)).toBe("earlier");
  });
  it("treats just after Cairo midnight as the new day", () => {
    // 22:30Z on the 24th is 00:30 on the 25th in Cairo (UTC+2).
    expect(dayBucket(new Date("2026-11-24T22:30:00Z"), now)).toBe("today");
  });
  it("keeps order and drops empty groups", () => {
    const g = groupByDay([{ at: "2026-11-25T09:00:00Z" }, { at: "2026-11-01T09:00:00Z" }], now);
    expect(g.map((x) => x.bucket)).toEqual(["today", "earlier"]);
  });
});
