import { describe, expect, it } from "vitest";
import { projectStats, sortByDeadline } from "@/domain/project-stats";

describe("projectStats", () => {
  it("folds internal statuses into five groups", () => {
    const s = projectStats([
      { status: "triage", count: 2 },
      { status: "planned", count: 1 },
      { status: "in_progress", count: 2 },
      { status: "needs_info", count: 1 },
      { status: "done", count: 4 },
    ]);
    expect(s.byGroup).toEqual({ request: 2, processing: 3, stuck: 1, completed: 0, done: 4 });
    expect(s.open).toBe(6);
    expect(s.total).toBe(10);
    expect(s.progress).toBe(40);
  });
  it("handles an empty project", () => expect(projectStats([]).progress).toBe(0));
  it("ignores cancelled tasks", () => expect(projectStats([{ status: "closed", count: 5 }]).total).toBe(0));
});

describe("sortByDeadline", () => {
  it("puts the earliest due first and no-date last", () => {
    const list = [
      { name: "C", nextDue: null },
      { name: "B", nextDue: new Date("2026-12-05") },
      { name: "A", nextDue: new Date("2026-11-30") },
    ];
    expect(sortByDeadline(list).map((x) => x.name)).toEqual(["A", "B", "C"]);
  });
});
