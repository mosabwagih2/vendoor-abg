import { describe, expect, it } from "vitest";
import { actionForGroupMove, actionForMove, resolveTarget, waitingOn } from "@/domain/workflow";

describe("waiting on (PRD 4.2)", () => {
  it.each([
    ["triage", "abg"],
    ["needs_info", "vendoor"],
    ["planned", "abg"],
    ["in_progress", "abg"],
    ["shipped", "vendoor"],
    ["reopened", "abg"],
    ["done", null],
    ["closed", null],
  ] as const)("%s → %s", (status, side) => expect(waitingOn(status)).toBe(side));
});

describe("transitions", () => {
  it("answer returns to the ABG status it came from", () => {
    expect(resolveTarget("answer", "in_progress")).toBe("in_progress");
    expect(resolveTarget("answer", "planned")).toBe("planned");
    expect(resolveTarget("answer", null)).toBe("triage");
  });
  it("board moves map to actions", () => {
    expect(actionForMove("planned", "in_progress")).toBe("start");
    expect(actionForMove("in_progress", "shipped")).toBe("ship");
    expect(actionForMove("shipped", "done")).toBe("verify");
    expect(actionForMove("shipped", "reopened")).toBe("reopen");
    expect(actionForMove("planned", "done")).toBeNull();
    expect(actionForMove("triage", "in_progress")).toBeNull();
  });
});

describe("five-column board", () => {
  it.each([
    ["triage", "processing", "accept"],
    ["planned", "completed", null], // must start first
    ["in_progress", "completed", "ship"],
    ["shipped", "done", "verify"],
    ["shipped", "processing", "reopen"],
    ["needs_info", "processing", "answer"],
    ["in_progress", "stuck", "ask_info"],
    ["triage", "stuck", "ask_info"],
  ] as const)("%s → %s is %s", (from, to, action) => expect(actionForGroupMove(from, to)).toBe(action));

  it("does nothing inside a column", () => {
    expect(actionForGroupMove("planned", "processing")).toBeNull();
    expect(actionForGroupMove("in_progress", "processing")).toBeNull();
  });

  it("never allows skipping the verification", () => {
    expect(actionForGroupMove("in_progress", "done")).toBeNull();
    expect(actionForGroupMove("triage", "done")).toBeNull();
  });

  it("never closes a task by dragging", () => {
    for (const from of ["triage", "needs_info", "planned", "in_progress", "shipped", "reopened"] as const) expect(actionForGroupMove(from, "done") === "cancel").toBe(false);
  });
});
