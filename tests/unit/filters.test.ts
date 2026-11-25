import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY, DEFAULT_FILTERS, parseFilters, serializeFilters } from "@/lib/filters";

describe("filter ↔ URL codec (FR-5.3: filters persist in the URL)", () => {
  it("round-trips", () => {
    const filters = { ...DEFAULT_FILTERS, project: ["BOS", "ORD"], status: ["shipped" as const], priority: ["highest" as const], waiting: ["vendoor" as const], q: "bosta", due: "overdue" as const };
    const display = { ...DEFAULT_DISPLAY, view: "board" as const, group: "project" as const, showClosed: true };
    const qs = serializeFilters(filters, display);
    const back = parseFilters(new URLSearchParams(qs));
    expect(back.filters).toEqual(filters);
    expect(back.display).toEqual(display);
  });
  it("defaults serialise to an empty string", () => expect(serializeFilters({}, {})).toBe(""));
  it("ignores unknown values", () => {
    const { filters } = parseFilters(new URLSearchParams("status=bogus,done&priority=x"));
    expect(filters.status).toEqual(["done"]);
    expect(filters.priority).toEqual([]);
  });
});
