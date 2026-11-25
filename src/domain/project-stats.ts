import { STATUS_GROUPS, statusGroup, type StatusGroup } from "./status-display";
import type { TaskStatus } from "./types";

/** Counts of tasks per display status for one project, plus the numbers the Projects page shows. */
export interface ProjectStats {
  byGroup: Record<StatusGroup, number>;
  open: number;
  done: number;
  total: number;
  /** Share of tasks that are Done, 0 to 100. */
  progress: number;
}

export function projectStats(rows: Array<{ status: TaskStatus; count: number }>): ProjectStats {
  const byGroup = Object.fromEntries(STATUS_GROUPS.map((g) => [g, 0])) as Record<StatusGroup, number>;
  for (const r of rows) {
    const g = statusGroup(r.status);
    if (g) byGroup[g] += r.count;
  }
  const total = Object.values(byGroup).reduce((a, b) => a + b, 0);
  const done = byGroup.done;
  return { byGroup, open: total - done, done, total, progress: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Sorts projects by the earliest open due date first; projects with no due date go last, then by name. */
export function sortByDeadline<T extends { nextDue: Date | null; name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.nextDue && b.nextDue) return a.nextDue.getTime() - b.nextDue.getTime() || a.name.localeCompare(b.name);
    if (a.nextDue) return -1;
    if (b.nextDue) return 1;
    return a.name.localeCompare(b.name);
  });
}
