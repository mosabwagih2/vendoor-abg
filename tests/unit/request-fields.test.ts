import { describe, expect, it } from "vitest";
import { missingFields } from "@/domain/request-fields";

describe("New request typed fields (PRD 6.7)", () => {
  it("Bug requires what happens, what should happen, accounts, evidence, how often and priority", () => {
    expect(missingFields({ type: "bug", title: "x" }).sort()).toEqual(["accounts", "attachments", "currentBehaviour", "expectedBehaviour", "howOften", "suggestedPriority"].sort());
  });
  it("Bug requires order codes only when order-related", () => {
    const base = { type: "bug" as const, title: "x", currentBehaviour: "a", expectedBehaviour: "b", accounts: ["ve1"], attachments: [{}], howOften: "once", suggestedPriority: "high" };
    expect(missingFields(base)).toEqual([]);
    expect(missingFields({ ...base, isOrderRelated: true })).toEqual(["orderCodes"]);
  });
  it("Change requires why it matters", () => {
    expect(missingFields({ type: "change", title: "x", currentBehaviour: "a", expectedBehaviour: "b", suggestedPriority: "low" })).toEqual(["whyItMatters"]);
  });
  it("Feature does not require what happens now", () => {
    expect(missingFields({ type: "feature", title: "x", expectedBehaviour: "b", suggestedPriority: "low", whyItMatters: "c" })).toEqual([]);
  });
  it("Question needs only a title", () => {
    expect(missingFields({ type: "question", title: "How do I export one account?" })).toEqual([]);
  });
  it("Sub-tasks need only a title", () => {
    expect(missingFields({ type: "bug", title: "x", parentId: "p" })).toEqual([]);
  });
});
