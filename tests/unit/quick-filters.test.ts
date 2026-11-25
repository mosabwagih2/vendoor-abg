import { describe, expect, it } from "vitest";
import { activeQuick, quickPatch } from "@/lib/filters";
import { GROUP_MEMBERS, STATUS_GROUPS, statusGroup } from "@/domain/status-display";
import { TASK_STATUSES } from "@/domain/types";

describe("quick filters", () => {
  it("Needs me uses the viewer's side", () => {
    expect(quickPatch("needs_me", "vendoor")).toEqual({ waiting: ["vendoor"], due: "" });
    expect(quickPatch("needs_me", "abg")).toEqual({ waiting: ["abg"], due: "" });
  });
  it("All clears the quick fields", () => expect(quickPatch("all", "abg")).toEqual({ waiting: [], due: "" }));
  it("lights the matching pill", () => {
    expect(activeQuick({ waiting: [], due: "" }, "abg")).toBe("all");
    expect(activeQuick({ waiting: ["abg"], due: "" }, "abg")).toBe("needs_me");
    expect(activeQuick({ waiting: ["vendoor"], due: "" }, "abg")).toBeNull();
    expect(activeQuick({ waiting: [], due: "week" }, "abg")).toBe("due_week");
    expect(activeQuick({ waiting: [], due: "overdue" }, "abg")).toBe("overdue");
    expect(activeQuick({ waiting: ["abg"], due: "week" }, "abg")).toBeNull();
  });
});

describe("status groups", () => {
  it("every status except closed belongs to exactly one of the five groups", () => {
    for (const s of TASK_STATUSES) {
      if (s === "closed") expect(statusGroup(s)).toBeNull();
      else expect(STATUS_GROUPS).toContain(statusGroup(s));
    }
  });
  it("group members round-trip", () => {
    for (const g of STATUS_GROUPS) for (const s of GROUP_MEMBERS[g]) expect(statusGroup(s)).toBe(g);
  });
});
