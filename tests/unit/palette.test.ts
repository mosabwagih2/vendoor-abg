import { describe, expect, it } from "vitest";
import { countsByKind, filterItems, matchActions, moveSelection, pushRecent, type PaletteItem } from "@/domain/palette";

const item = (kind: PaletteItem["kind"], id: string, title = id): PaletteItem => ({ id, kind, title, subtitle: "" });
const items = [item("recent", "r1"), item("task", "t1"), item("task", "t2"), item("project", "p1"), item("action", "a1", "Create a request")];

describe("palette", () => {
  it("filters by tab and keeps everything on All", () => {
    expect(filterItems(items, "all")).toHaveLength(5);
    expect(filterItems(items, "tasks").map((i) => i.id)).toEqual(["t1", "t2"]);
    expect(filterItems(items, "people")).toEqual([]);
  });
  it("counts per kind", () => expect(countsByKind(items)).toEqual({ tasks: 2, projects: 1, people: 0, actions: 1 }));
  it("wraps the selection", () => {
    expect(moveSelection(0, -1, 4)).toBe(3);
    expect(moveSelection(3, 1, 4)).toBe(0);
    expect(moveSelection(0, 1, 0)).toBe(0);
  });
  it("matches actions by title", () => {
    expect(matchActions(items.filter((i) => i.kind === "action"), "request")).toHaveLength(1);
    expect(matchActions(items.filter((i) => i.kind === "action"), "zzz")).toHaveLength(0);
  });
  it("keeps recents unique and capped", () => {
    expect(pushRecent(["a", "b"], "b")).toEqual(["b", "a"]);
    expect(pushRecent(["1", "2", "3", "4", "5"], "6")).toEqual(["6", "1", "2", "3", "4"]);
  });
});
