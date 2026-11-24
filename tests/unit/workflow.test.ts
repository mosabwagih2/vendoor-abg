import { describe, expect, it } from "vitest";
import { actionForMove, resolveTarget, waitingOn } from "@/domain/workflow";

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
