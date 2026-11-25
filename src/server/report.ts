import "server-only";
import { db } from "./db";
import { getWorkspaceConfig } from "./calendar";
import { localDateKey, workingMinutesBetween } from "@/domain/sla";
import { bucketsFor, shiftRange, type Bucket, type Range } from "@/domain/report-range";
import { projectStats } from "@/domain/project-stats";
import { STATUS_GROUPS, statusGroup, type StatusGroup } from "@/domain/status-display";
import type { TaskStatus } from "@/domain/types";
import { startOfLocalDay } from "./local-time";

export interface Kpis {
  created: number;
  completed: number;
  /** Average working minutes from filing to first reply. */
  firstResponseMin: number | null;
  /** Average working days from filing to Completed. */
  resolutionDays: number | null;
  reopened: number;
}

export interface ReportData {
  kpis: Kpis;
  previous: Kpis;
  chart: Array<{ label: string; created: number; completed: number }>;
  now: Record<StatusGroup, number>;
  byProject: Array<{ key: string; name: string; created: number; done: number; progress: number }>;
  byPerson: Array<{ id: string; name: string; assigned: number; done: number; avgDays: number | null }>;
}

export interface ReportFilters {
  project?: string;
  assignee?: string;
}

/** Reopen events in the period. With a project or assignee filter, only events on tasks inside that scope count. */
async function countReopened(between: { gte: Date; lt: Date }, scope: object, scoped: boolean) {
  const events = await db.activityEvent.findMany({ where: { verb: "reopened", at: between }, select: { taskId: true } });
  if (!scoped) return events.length;
  const ids = events.map((e) => e.taskId).filter((x): x is string => !!x);
  return ids.length ? db.task.count({ where: { ...scope, id: { in: ids } } }) : 0;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Numbers for one period. `tasks` are the tasks touched by the period, already filtered. */
async function kpisFor(range: Range, tz: string, filters: ReportFilters) {
  const cfg = await getWorkspaceConfig();
  const from = startOfLocalDay(range.start, tz);
  const to = startOfLocalDay(range.end, tz);
  const between = { gte: from, lt: to };
  const scope = { archivedAt: null, ...(filters.project ? { project: { key: filters.project } } : {}), ...(filters.assignee ? { assigneeId: filters.assignee } : {}) };
  const [created, shipped, reopenedEvents] = await Promise.all([
    db.task.findMany({ where: { ...scope, createdAt: between }, select: { createdAt: true, firstResponseAt: true, projectId: true, assigneeId: true } }),
    db.task.findMany({ where: { ...scope, shippedAt: between }, select: { createdAt: true, shippedAt: true, projectId: true, assigneeId: true } }),
    countReopened(between, scope, Boolean(filters.project || filters.assignee)),
  ]);
  const dayMinutes = Math.max(60, cfg.calendar.endMin - cfg.calendar.startMin);
  const first = created.filter((t) => t.firstResponseAt).map((t) => workingMinutesBetween(cfg.calendar, t.createdAt, t.firstResponseAt!));
  const res = shipped.map((t) => workingMinutesBetween(cfg.calendar, t.createdAt, t.shippedAt!) / dayMinutes);
  const kpis: Kpis = { created: created.length, completed: shipped.length, firstResponseMin: avg(first), resolutionDays: avg(res), reopened: reopenedEvents };
  return { kpis, created, shipped, dayMinutes };
}

export async function loadReport(range: Range, filters: ReportFilters): Promise<ReportData> {
  const cfg = await getWorkspaceConfig();
  const tz = cfg.calendar.tz;
  const [cur, prev] = await Promise.all([kpisFor(range, tz, filters), kpisFor(shiftRange(range, -1), tz, filters)]);

  const bucketOf = (at: Date, buckets: Bucket[]) => {
    const key = localDateKey(at, tz);
    if (range.kind === "day") {
      const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(at)) % 24;
      return buckets[h];
    }
    return buckets.find((b) => key >= b.start && key < b.end);
  };
  const buckets = bucketsFor(range);
  const chart = buckets.map((b) => ({ label: b.label, created: 0, completed: 0 }));
  for (const t of cur.created) {
    const b = bucketOf(t.createdAt, buckets);
    if (b) chart[buckets.indexOf(b)].created++;
  }
  for (const t of cur.shipped) {
    const b = bucketOf(t.shippedAt!, buckets);
    if (b) chart[buckets.indexOf(b)].completed++;
  }

  const [grouped, projects, people, allByProject] = await Promise.all([
    db.task.groupBy({ by: ["status"], where: { archivedAt: null, ...(filters.project ? { project: { key: filters.project } } : {}), ...(filters.assignee ? { assigneeId: filters.assignee } : {}) }, _count: true }),
    db.project.findMany({ where: { archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, key: true, name: true } }),
    db.member.findMany({ where: { status: { not: "deactivated" }, team: { side: "delivery" } }, select: { id: true, name: true } }),
    db.task.groupBy({ by: ["projectId", "status"], where: { archivedAt: null }, _count: true }),
  ]);
  const now = Object.fromEntries(STATUS_GROUPS.map((g) => [g, 0])) as Record<StatusGroup, number>;
  for (const r of grouped) {
    const g = statusGroup(r.status as TaskStatus);
    if (g) now[g] += r._count;
  }

  const byProject = projects
    .map((p) => ({
      key: p.key,
      name: p.name,
      created: cur.created.filter((t) => t.projectId === p.id).length,
      done: cur.shipped.filter((t) => t.projectId === p.id).length,
      progress: projectStats(allByProject.filter((r) => r.projectId === p.id).map((r) => ({ status: r.status as TaskStatus, count: r._count }))).progress,
    }))
    .filter((p) => p.created || p.done)
    .sort((a, b) => b.created - a.created);

  const byPerson = people
    .map((m) => {
      const mine = cur.shipped.filter((t) => t.assigneeId === m.id);
      return {
        id: m.id,
        name: m.name,
        assigned: cur.created.filter((t) => t.assigneeId === m.id).length,
        done: mine.length,
        avgDays: avg(mine.map((t) => workingMinutesBetween(cfg.calendar, t.createdAt, t.shippedAt!) / cur.dayMinutes)),
      };
    })
    .sort((a, b) => b.assigned - a.assigned);

  return { kpis: cur.kpis, previous: prev.kpis, chart, now, byProject, byPerson };
}
