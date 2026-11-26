import "server-only";
import { db } from "./db";
import { getWorkspaceConfig } from "./calendar";
import { localDateKey } from "@/domain/sla";
import { startOfLocalDay } from "./local-time";
import { addDays, previousWeek, weekRange, type WeekRange } from "@/domain/week";
import type { WeeklySummary } from "@/domain/weekly-text";

export interface WeekTotals {
  requested: number;
  completed: number;
  done: number;
  released: number;
  incidents: number;
}

export interface WeeklyReport {
  week: WeekRange;
  totals: WeekTotals;
  previous: WeekTotals;
  /** Per worked day: requests filed and tasks completed. */
  days: Array<{ key: string; requested: number; completed: number }>;
  releases: Array<{ number: string; type: string; releasedAt: string; taskCount: number }>;
}

async function totalsFor(range: WeekRange, tz: string): Promise<{ totals: WeekTotals; byDay: WeeklyReport["days"] }> {
  const from = startOfLocalDay(range.start, tz);
  const to = startOfLocalDay(addDays(range.end, 1), tz);
  const between = { gte: from, lt: to };
  const [created, shipped, verified, released, incidents] = await Promise.all([
    db.task.findMany({ where: { createdAt: between, archivedAt: null }, select: { createdAt: true } }),
    db.task.findMany({ where: { shippedAt: between, archivedAt: null }, select: { shippedAt: true } }),
    db.task.count({ where: { verifiedAt: between, archivedAt: null } }),
    db.release.count({ where: { state: "released", releasedAt: between } }),
    db.incident.count({ where: { startedAt: between, archivedAt: null } }),
  ]);
  const byDay = range.workDays.map((key) => ({
    key,
    requested: created.filter((t) => localDateKey(t.createdAt, tz) === key).length,
    completed: shipped.filter((t) => t.shippedAt && localDateKey(t.shippedAt, tz) === key).length,
  }));
  return { totals: { requested: created.length, completed: shipped.length, done: verified, released, incidents }, byDay };
}

/** Everything on the weekly report comes from tasks, releases and incidents. Nothing is typed in by hand. */
export async function weeklyReport(startKey: string): Promise<WeeklyReport> {
  const cfg = await getWorkspaceConfig();
  const tz = cfg.calendar.tz;
  const week = weekRange(startKey);
  const [current, previous] = await Promise.all([totalsFor(week, tz), totalsFor(weekRange(previousWeek(week.start)), tz)]);
  const rels = await db.release.findMany({
    where: { state: "released", releasedAt: { gte: startOfLocalDay(week.start, tz), lt: startOfLocalDay(addDays(week.end, 1), tz) } },
    orderBy: { releasedAt: "asc" },
    select: { number: true, type: true, releasedAt: true, _count: { select: { tasks: true } } },
  });
  return {
    week,
    totals: current.totals,
    previous: previous.totals,
    days: current.byDay,
    releases: rels.map((r) => ({ number: r.number, type: r.type, releasedAt: r.releasedAt!.toISOString(), taskCount: r._count.tasks })),
  };
}

const RANK: Record<string, number> = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };

/** Everything the share text needs, from the same tasks, releases and events as the report screen. */
export async function weeklySummary(startKey: string): Promise<WeeklySummary> {
  const cfg = await getWorkspaceConfig();
  const tz = cfg.calendar.tz;
  const r = await weeklyReport(startKey);
  const from = startOfLocalDay(r.week.start, tz);
  const to = startOfLocalDay(addDays(r.week.end, 1), tz);
  const reopenEvents = await db.activityEvent.findMany({ where: { verb: "reopened", at: { gte: from, lt: to } }, select: { taskId: true } });
  const ids = [...new Set(reopenEvents.map((e) => e.taskId).filter((x): x is string => !!x))];
  const [broken, waiting, abg] = await Promise.all([
    ids.length ? db.task.findMany({ where: { id: { in: ids } }, select: { key: true, title: true, reopenCount: true } }) : [],
    db.task.findMany({ where: { archivedAt: null, status: "shipped" }, orderBy: { shippedAt: "asc" }, take: 8, select: { key: true } }),
    db.task.findMany({ where: { archivedAt: null, status: { in: ["triage", "planned", "in_progress", "reopened"] } }, select: { key: true, title: true, priority: true, suggestedPriority: true, dueAt: true }, take: 200 }),
  ]);
  const asks = [...abg]
    .sort((a, b) => (RANK[a.priority ?? a.suggestedPriority ?? "lowest"] ?? 4) - (RANK[b.priority ?? b.suggestedPriority ?? "lowest"] ?? 4) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
    .slice(0, 3)
    .map((t) => ({ key: t.key, title: t.title }));
  return {
    start: r.week.start,
    end: r.week.end,
    completed: r.totals.completed,
    verified: r.totals.done,
    releases: r.releases.map((x) => ({ number: x.number, taskCount: x.taskCount })),
    cameBackBroken: broken.map((t) => ({ key: t.key, title: t.title, times: t.reopenCount })),
    waitingCheck: waiting.map((t) => t.key),
    asks,
  };
}
