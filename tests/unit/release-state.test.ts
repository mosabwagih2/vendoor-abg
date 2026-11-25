import { describe, expect, it } from "vitest";
import { canDeploy, canRollBack, RELEASE_LABEL, statusAfterRollback } from "@/domain/release-state";

describe("release state", () => {
  it("names the three states for people", () => {
    expect(RELEASE_LABEL).toEqual({ upcoming: "draft", released: "live", rolled_back: "rolledBack" });
  });
  it("only a live release can be rolled back", () => {
    expect(canRollBack("released")).toBe(true);
    expect(canRollBack("upcoming")).toBe(false);
    expect(canRollBack("rolled_back")).toBe(false);
  });
  it("only a draft can be deployed", () => {
    expect(canDeploy("upcoming")).toBe(true);
    expect(canDeploy("released")).toBe(false);
    expect(canDeploy("rolled_back")).toBe(false);
  });
  it("sends Completed tasks back to Processing and leaves the rest", () => {
    expect(statusAfterRollback("shipped")).toBe("in_progress");
    expect(statusAfterRollback("done")).toBeNull();
    expect(statusAfterRollback("in_progress")).toBeNull();
    expect(statusAfterRollback("needs_info")).toBeNull();
  });
});
