import { describe, expect, it } from "vitest";
import { countByTab, filterByTab, inboxHint, parseInboxTab, turnFor } from "@/domain/inbox";

describe("inbox tabs", () => {
  it("defaults to Your turn and ignores unknown values", () => {
    expect(parseInboxTab(undefined)).toBe("turn");
    expect(parseInboxTab("nonsense")).toBe("turn");
    expect(parseInboxTab("waiting")).toBe("waiting");
    expect(parseInboxTab("all")).toBe("all");
  });

  it("works out whose turn it is from the viewer's side", () => {
    expect(turnFor("vendoor", "vendoor")).toBe("mine");
    expect(turnFor("abg", "vendoor")).toBe("theirs");
    expect(turnFor("abg", "abg")).toBe("mine");
    expect(turnFor(null, "abg")).toBe("none");
  });

  const rows = [
    { id: 1, waitingOn: "vendoor" as const },
    { id: 2, waitingOn: "abg" as const },
    { id: 3, waitingOn: "abg" as const },
    { id: 4, waitingOn: null },
  ];

  it("counts and filters rows for Vendoor", () => {
    expect(countByTab(rows, "vendoor")).toEqual({ turn: 1, waiting: 2, all: 4 });
    expect(filterByTab(rows, "turn", "vendoor").map((r) => r.id)).toEqual([1]);
    expect(filterByTab(rows, "waiting", "vendoor").map((r) => r.id)).toEqual([2, 3]);
    expect(filterByTab(rows, "all", "vendoor")).toHaveLength(4);
  });

  it("flips the tabs for ABG", () => {
    expect(countByTab(rows, "abg")).toEqual({ turn: 2, waiting: 1, all: 4 });
  });
});

describe("inbox hint", () => {
  const base = { waitingOn: null, sla: null };
  it("tells Vendoor to verify a shipped task", () => {
    expect(inboxHint({ ...base, status: "shipped", waitingOn: "vendoor" }, "vendoor")).toEqual({ kind: "verify" });
  });
  it("tells Vendoor that ABG asked a question", () => {
    expect(inboxHint({ ...base, status: "needs_info", waitingOn: "vendoor" }, "vendoor")).toEqual({ kind: "asked" });
  });
  it("flags a reopened task", () => {
    expect(inboxHint({ ...base, status: "reopened", waitingOn: "abg" }, "abg")).toEqual({ kind: "reopened" });
  });
  it("shows overdue when the clock is breached", () => {
    expect(inboxHint({ status: "planned", waitingOn: "abg", sla: { state: "breached", dueAt: "2026-11-25T10:00:00Z" } }, "vendoor")).toEqual({ kind: "overdue" });
  });
  it("shows the reply deadline while ABG still has time", () => {
    expect(inboxHint({ status: "triage", waitingOn: "abg", sla: { state: "at_risk", dueAt: "2026-11-25T10:00:00Z" } }, "vendoor")).toEqual({ kind: "reply_due", dueAt: "2026-11-25T10:00:00Z" });
  });
  it("says nothing when the clock is paused", () => {
    expect(inboxHint({ status: "needs_info", waitingOn: "vendoor", sla: { state: "paused", dueAt: null } }, "abg")).toBeNull();
  });
});
