import "server-only";
import { db } from "./db";
import { getWorkspaceConfig } from "./calendar";
import { localDateKey } from "@/domain/sla";
import { addDays, previousWeek, weekRange, type WeekRange } from "@/domain/week";

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

/** Midnight of a local day key as an instant. The workspace timezone is Africa/Cairo (UTC+2/+3), so we resolve the offset per day. */
function startOfLocalDay(key: string, tz: string): Date {
  const guess = new Date(`${key}T00:00:00Z`);
  // Shift by the zone's offset at that moment so localDateKey(result) === key.
  for (const hours of [0, -1, -2, -3, -4]) {
    const d = new Date(guess.getTime() + hours * 3_600_000);
    if (localDateKey(d, tz) === key && localDateKey(new Date(d.getTime() - 1), tz) !== key) return d;
  }
  return guess;
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
