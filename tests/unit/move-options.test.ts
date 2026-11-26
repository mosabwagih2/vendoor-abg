import { describe, expect, it } from "vitest";
import { moveOptions } from "@/domain/move-options";

describe("moveOptions", () => {
  it("offers Stuck and Completed from Processing for ABG, with Processing ticked", () => {
    expect(moveOptions("in_progress", ["ask_info", "ship"])).toEqual([
      { group: "processing", action: null, current: true },
      { group: "stuck", action: "ask_info", current: false },
      { group: "completed", action: "ship", current: false },
    ]);
  });
  it("does not list a move to the step the task is already in", () => {
    expect(moveOptions("planned", ["start", "ask_info"]).map((o) => o.group)).toEqual(["processing", "stuck"]);
  });
  it("offers Done and back to Processing to Vendoor after Completed", () => {
    expect(moveOptions("shipped", ["verify", "reopen"]).map((o) => o.group)).toEqual(["completed", "done", "processing"]);
  });
  it("lists each step once", () => expect(moveOptions("triage", ["accept", "answer"]).map((o) => o.group)).toEqual(["request", "processing"]));
  it("has only the current step when nothing is allowed", () => expect(moveOptions("done", [])).toEqual([{ group: "done", action: null, current: true }]));
});
