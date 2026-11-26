import { describe, expect, it } from "vitest";
import { NAME_MAX, STATUS_COLORS, checkName, isCustomGroup, isStatusColor, stillValid, tintFor } from "@/domain/custom-status";

const existing = [{ id: "a", stepGroup: "processing", name: "Testing" }];

describe("checkName", () => {
  it("rejects empty and too long names", () => {
    expect(checkName("   ", "processing", existing)).toBe("empty");
    expect(checkName("x".repeat(NAME_MAX + 1), "processing", existing)).toBe("too_long");
  });
  it("rejects a duplicate inside the same step, ignoring case", () => expect(checkName(" testing ", "processing", existing)).toBe("duplicate"));
  it("allows the same name in another step and the status's own name when renaming", () => {
    expect(checkName("Testing", "stuck", existing)).toBeNull();
    expect(checkName("Testing", "processing", existing, "a")).toBeNull();
  });
});

describe("stillValid", () => {
  it("keeps a custom status only while the task stays in its step", () => {
    expect(stillValid({ stepGroup: "processing" }, "in_progress")).toBe(true);
    expect(stillValid({ stepGroup: "processing" }, "planned")).toBe(true);
    expect(stillValid({ stepGroup: "processing" }, "shipped")).toBe(false);
    expect(stillValid(null, "in_progress")).toBe(false);
  });
});

describe("palette and groups", () => {
  it("knows its colours", () => {
    expect(STATUS_COLORS).toHaveLength(8);
    expect(isStatusColor("#2563eb")).toBe(true);
    expect(isStatusColor("red")).toBe(false);
  });
  it("does not allow custom statuses in Done", () => {
    expect(isCustomGroup("processing")).toBe(true);
    expect(isCustomGroup("done")).toBe(false);
  });
  it("tints from the colour", () => expect(tintFor("#2563eb").dot).toBe("#2563eb"));
});
