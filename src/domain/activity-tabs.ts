import type { Side } from "./types";

/**
 * Tabs under a task (Figma 1.3 / 2.3). Everyone sees Comments and History;
 * only ABG sees Internal notes, because Vendoor must never read them.
 */
export type ActivityTab = "all" | "comments" | "internal" | "history";

export function tabsFor(side: Side): ActivityTab[] {
  return side === "abg" ? ["all", "comments", "internal", "history"] : ["all", "comments", "history"];
}

export interface ActivityEntry {
  kind: "comment" | "event";
  /** Internal comment (ABG only). History events can be internal too. */
  isInternal: boolean;
}

export function inTab(entry: ActivityEntry, tab: ActivityTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "comments":
      return entry.kind === "comment" && !entry.isInternal;
    case "internal":
      return entry.kind === "comment" && entry.isInternal;
    case "history":
      return entry.kind === "event";
  }
}

export function countTabs(entries: ActivityEntry[], side: Side): Record<ActivityTab, number> {
  const out = { all: 0, comments: 0, internal: 0, history: 0 } satisfies Record<ActivityTab, number>;
  for (const e of entries) {
    if (e.isInternal && side !== "abg") continue; // Vendoor never counts what it cannot see.
    out.all += 1;
    for (const tab of tabsFor(side)) if (tab !== "all" && inTab(e, tab)) out[tab] += 1;
  }
  return out;
}

/** Ready-made replies that fill the box instead of sending, so people can edit them first. */
export function prefilledReplies(side: Side): Array<"worksForMe" | "needMoreInfo" | "pleaseCheckAgain" | "fixedPleaseTest" | "needMoreDetails" | "cantReproduce"> {
  return side === "vendoor" ? ["worksForMe", "needMoreInfo", "pleaseCheckAgain"] : ["fixedPleaseTest", "needMoreDetails", "cantReproduce"];
}
