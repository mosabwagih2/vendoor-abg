import { describe, expect, it } from "vitest";
import { dueLabel } from "@/domain/due-label";

const now = new Date("2026-11-25T10:00:00Z");

describe("dueLabel", () => {
  it("counts late days by calendar day", () => expect(dueLabel(new Date("2026-11-24T09:00:00Z"), now)).toEqual({ kind: "late", days: 1 }));
  it("is today even later in the day", () => expect(dueLabel(new Date("2026-11-25T20:00:00Z"), now)).toEqual({ kind: "today" }));
  it("is tomorrow", () => expect(dueLabel(new Date("2026-11-26T09:00:00Z"), now)).toEqual({ kind: "tomorrow" }));
  it("falls back to the date", () => expect(dueLabel(new Date("2026-11-30T09:00:00Z"), now).kind).toBe("date"));
  it("uses Cairo midnight, not UTC", () => {
    // 22:30Z on the 25th is already the 26th in Cairo.
    expect(dueLabel(new Date("2026-11-25T22:30:00Z"), now)).toEqual({ kind: "tomorrow" });
  });
});
