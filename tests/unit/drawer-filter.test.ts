import { describe, expect, it } from "vitest";
import { countsFor, filterDrawer } from "@/domain/drawer-filter";

const items = [
  { id: "a", incident: 12 },
  { id: "b", incident: null },
  { id: "c", incident: null },
];
const needs = (i: { id: string }) => i.id === "b";

describe("filterDrawer", () => {
  it("keeps everything on All", () => expect(filterDrawer(items, "all", needs)).toHaveLength(3));
  it("shows only system problems on System", () => expect(filterDrawer(items, "system", needs).map((i) => i.id)).toEqual(["a"]));
  it("shows only task items that need the viewer on Needs me, never incidents", () => expect(filterDrawer(items, "needs_me", () => true).map((i) => i.id)).toEqual(["b", "c"]));
  it("counts each filter", () => expect(countsFor(items, needs)).toEqual({ all: 3, needs_me: 1, system: 1 }));
});
