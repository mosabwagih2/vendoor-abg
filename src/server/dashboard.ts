import "server-only";
import { db } from "./db";
import { statusGroup, STATUS_GROUPS, type StatusGroup } from "@/domain/status-display";
import type { Priority, TaskStatus } from "@/domain/types";

export interface DashTask {
  key: string;
  title: string;
  priority: Priority | null;
  dueAt: string | null;
  statusChangedAt: string;
}

export interface Dashboard {
  counts: Record<StatusGroup, number>;
  total: number;
  dueSoon: DashTask[];
  people: Array<{ id: string; name: string; role: string; open: number }>;
  unassigned: number;
  waitingOnVendoor: DashTask[];
  waitingTotal: number;
  triage: number;
}

const OPEN: TaskStatus[] = ["triage", "needs_info", "planned", "in_progress", "reopened"];
const pick = { key: true, title: true, priority: true, suggestedPriority: true, dueAt: true, statusChangedAt: true } as const;
const shape = (t: { key: string; title: string; priority: Priority | null; suggestedPriority: Priority | null; dueAt: Date | null; statusChangedAt: Date }): DashTask => ({
  key: t.key,
  title: t.title,
  priority: t.priority ?? t.suggestedPriority,
  dueAt: t.dueAt?.toISOString() ?? null,
  statusChangedAt: t.statusChangedAt.toISOString(),
});

/** Figma 2.1: everything on the ABG dashboard comes from live tasks. */
export async function loadDashboard(): Promise<Dashboard> {
  const [grouped, dueSoon, abg, assigned, unassigned, waiting, waitingTotal] = await Promise.all([
    db.task.groupBy({ by: ["status"], where: { archivedAt: null }, _count: true }),
    db.task.findMany({ where: { archivedAt: null, status: { in: OPEN }, dueAt: { not: null } }, orderBy: { dueAt: "asc" }, take: 5, select: pick }),
    db.member.findMany({ where: { status: { not: "deactivated" }, team: { side: "delivery" } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    db.task.groupBy({ by: ["assigneeId"], where: { archivedAt: null, status: { in: ["planned", "in_progress", "reopened"] }, assigneeId: { not: null } }, _count: true }),
    db.task.count({ where: { archivedAt: null, status: { in: ["planned", "in_progress", "reopened"] }, assigneeId: null } }),
    db.task.findMany({ where: { archivedAt: null, status: { in: ["needs_info", "shipped"] } }, orderBy: { statusChangedAt: "asc" }, take: 5, select: pick }),
    db.task.count({ where: { archivedAt: null, status: { in: ["needs_info", "shipped"] } } }),
  ]);
  const counts = Object.fromEntries(STATUS_GROUPS.map((g) => [g, 0])) as Record<StatusGroup, number>;
  for (const r of grouped) {
    const g = statusGroup(r.status as TaskStatus);
    if (g) counts[g] += r._count;
  }
  const open = new Map(assigned.map((a) => [a.assigneeId, a._count]));
  return {
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    dueSoon: dueSoon.map(shape),
    people: abg.map((m) => ({ id: m.id, name: m.name, role: m.role, open: open.get(m.id) ?? 0 })),
    unassigned,
    waitingOnVendoor: waiting.map(shape),
    waitingTotal,
    triage: counts.request,
  };
}
