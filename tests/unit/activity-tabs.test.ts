import { describe, expect, it } from "vitest";
import { countTabs, inTab, prefilledReplies, tabsFor } from "@/domain/activity-tabs";

const entries = [
  { kind: "comment" as const, isInternal: false },
  { kind: "comment" as const, isInternal: false },
  { kind: "comment" as const, isInternal: true },
  { kind: "event" as const, isInternal: false },
  { kind: "event" as const, isInternal: true },
];

describe("activity tabs", () => {
  it("hides Internal notes from Vendoor", () => {
    expect(tabsFor("vendoor")).toEqual(["all", "comments", "history"]);
    expect(tabsFor("abg")).toContain("internal");
  });

  it("sorts entries into tabs", () => {
    expect(entries.filter((e) => inTab(e, "comments"))).toHaveLength(2);
    expect(entries.filter((e) => inTab(e, "internal"))).toHaveLength(1);
    expect(entries.filter((e) => inTab(e, "history"))).toHaveLength(2);
    expect(entries.filter((e) => inTab(e, "all"))).toHaveLength(5);
  });

  it("counts everything for ABG", () => {
    expect(countTabs(entries, "abg")).toEqual({ all: 5, comments: 2, internal: 1, history: 2 });
  });

  it("does not count internal entries for Vendoor", () => {
    expect(countTabs(entries, "vendoor")).toEqual({ all: 3, comments: 2, internal: 0, history: 1 });
  });

  it("offers different ready replies per side", () => {
    expect(prefilledReplies("vendoor")).toContain("worksForMe");
    expect(prefilledReplies("abg")).toContain("fixedPleaseTest");
  });
});
