import { describe, expect, it } from "vitest";
import { shortAge } from "@/lib/format";

describe("shortAge", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  it.each([
    [10_000, "now"],
    [5 * MIN, "5m"],
    [59 * MIN, "59m"],
    [11 * HOUR, "11h"],
    [23 * HOUR, "23h"],
    [DAY, "1d"],
    [3 * DAY, "3d"],
    [13 * DAY, "13d"],
    [14 * DAY, "2w"],
  ])("%s ms → %s", (ms, label) => expect(shortAge(ago(ms), now)).toBe(label));
  it("uses the distance for future dates too", () => expect(shortAge(new Date(now.getTime() + 2 * HOUR), now)).toBe("2h"));
});
