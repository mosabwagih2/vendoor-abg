import type { Side, TaskStatus } from "./types";

/**
 * Inbox rules (Figma 1.2). The Inbox is task-centred: each row is a task that involves the viewer,
 * sorted into "Your turn" (the viewer has to act) and "Waiting on the other side".
 * Everything here is pure so it can be unit-tested without a database.
 */

export const INBOX_TABS = ["turn", "waiting", "all"] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export function parseInboxTab(value: string | undefined | null): InboxTab {
  return (INBOX_TABS as readonly string[]).includes(value ?? "") ? (value as InboxTab) : "turn";
}

/** Whose move it is, from the viewer's point of view. */
export function turnFor(waitingOn: Side | null, viewer: Side): "mine" | "theirs" | "none" {
  if (!waitingOn) return "none";
  return waitingOn === viewer ? "mine" : "theirs";
}

interface HintInput {
  status: TaskStatus;
  waitingOn: Side | null;
  sla: { state: "ok" | "at_risk" | "breached" | "paused"; dueAt: string | null } | null;
}

/** The short line under a row: what the viewer should know at a glance. */
export type InboxHint =
  | { kind: "verify" }
  | { kind: "asked" }
  | { kind: "overdue" }
  | { kind: "reply_due"; dueAt: string }
  | { kind: "reopened" }
  | null;

export function inboxHint(row: HintInput, viewer: Side): InboxHint {
  if (viewer === "vendoor" && row.status === "shipped") return { kind: "verify" };
  if (viewer === "vendoor" && row.status === "needs_info") return { kind: "asked" };
  if (row.status === "reopened" && row.waitingOn === "abg") return { kind: "reopened" };
  if (row.sla?.state === "breached") return { kind: "overdue" };
  if (row.sla?.dueAt && row.sla.state !== "paused" && row.waitingOn === "abg") return { kind: "reply_due", dueAt: row.sla.dueAt };
  return null;
}

/** Counts shown on the tabs. */
export function countByTab<T extends { waitingOn: Side | null }>(rows: T[], viewer: Side): Record<InboxTab, number> {
  let mine = 0;
  let theirs = 0;
  for (const r of rows) {
    const turn = turnFor(r.waitingOn, viewer);
    if (turn === "mine") mine += 1;
    else if (turn === "theirs") theirs += 1;
  }
  return { turn: mine, waiting: theirs, all: rows.length };
}

export function filterByTab<T extends { waitingOn: Side | null }>(rows: T[], tab: InboxTab, viewer: Side): T[] {
  if (tab === "all") return rows;
  return rows.filter((r) => turnFor(r.waitingOn, viewer) === (tab === "turn" ? "mine" : "theirs"));
}
