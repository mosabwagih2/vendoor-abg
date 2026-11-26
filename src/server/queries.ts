import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import type { TaskFilters, TaskDisplay } from "@/lib/filters";
import type { CurrentMember } from "./session";
import { getWorkspaceConfig } from "./calendar";
import { rankSimilar } from "@/domain/trigram";
import { addWorkingMinutes, endOfWorkingDay, localDateKey, workingMinutesBetween } from "@/domain/sla";
import { OPEN_STATUSES, waitingOn } from "@/domain/workflow";
import type { Priority, TaskStatus } from "@/domain/types";

export const taskRowSelect = {
  id: true,
  key: true,
  title: true,
  status: true,
  priority: true,
  suggestedPriority: true,
  type: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  statusChangedAt: true,
  shippedAt: true,
  occurrenceCount: true,
  attachmentCount: true,
  reopenCount: true,
  parentId: true,
  requesterId: true,
  assigneeId: true,
  slaFirstResponseDueAt: true,
  slaResolutionDueAt: true,
  firstResponseAt: true,
  closeReason: true,
  project: { select: { id: true, key: true, name: true } },
  customStatus: { select: { name: true, color: true } },
  assignee: { select: { id: true, name: true, handle: true } },
  requester: { select: { id: true, name: true, handle: true } },
  _count: { select: { subtasks: true } },
} satisfies Prisma.TaskSelect;

export type TaskRowRaw = Prisma.TaskGetPayload<{ select: typeof taskRowSelect }>;

export interface TaskRow extends Omit<TaskRowRaw, "dueAt" | "createdAt" | "updatedAt" | "statusChangedAt" | "shippedAt" | "slaFirstResponseDueAt" | "slaResolutionDueAt" | "firstResponseAt"> {
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  shippedAt: string | null;
  waitingOn: "abg" | "vendoor" | null;
  isOverdue: boolean;
  sla: { kind: "first_response" | "resolution"; state: "ok" | "at_risk" | "breached" | "paused"; dueAt: string | null } | null;
  unverified: boolean;
}

const PRIORITY_RANK: Record<Priority, number> = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };

/** Add derived fields (PRD 8: waiting_on, is_overdue, sla_state). */
export async function decorate(rows: TaskRowRaw[]): Promise<TaskRow[]> {
  const cfg = await getWorkspaceConfig();
  const now = new Date();
  const unverifiedCutoffs = new Map<string, boolean>();
  return rows.map((r) => {
    const status = r.status as TaskStatus;
    let sla: TaskRow["sla"] = null;
    if (status === "needs_info") sla = { kind: r.firstResponseAt ? "resolution" : "first_response", state: "paused", dueAt: null };
    else if (!r.firstResponseAt && status === "triage" && r.slaFirstResponseDueAt) sla = slaState("first_response", r.slaFirstResponseDueAt, (r.suggestedPriority ?? "medium") as Priority);
    else if (["planned", "in_progress", "reopened"].includes(status) && r.slaResolutionDueAt && r.priority) sla = slaState("resolution", r.slaResolutionDueAt, r.priority as Priority);
    function slaState(kind: "first_response" | "resolution", due: Date, p: Priority) {
      const target = kind === "first_response" ? cfg.targets[p]?.firstResponse : cfg.targets[p]?.resolution;
      let state: "ok" | "at_risk" | "breached" = "ok";
      if (now > due) state = "breached";
      else if (target && workingMinutesBetween(cfg.calendar, now, due) <= (target * cfg.atRiskPercentLeft) / 100) state = "at_risk";
      return { kind, state, dueAt: due.toISOString() };
    }
    const isOverdue = !!r.dueAt && OPEN_STATUSES.includes(status) && status !== "shipped" && now > r.dueAt;
    let unverified = false;
    if (status === "shipped" && r.shippedAt) {
      const k = r.shippedAt.toISOString();
      if (!unverifiedCutoffs.has(k)) {
        const limit = addWorkingMinutes(cfg.calendar, r.shippedAt, cfg.unverifiedWorkingDays * 480);
        unverifiedCutoffs.set(k, !!limit && now > limit);
      }
      unverified = unverifiedCutoffs.get(k)!;
    }
    return {
      ...r,
      dueAt: r.dueAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      statusChangedAt: r.statusChangedAt.toISOString(),
      shippedAt: r.shippedAt?.toISOString() ?? null,
      slaFirstResponseDueAt: undefined,
      slaResolutionDueAt: undefined,
      firstResponseAt: undefined,
      waitingOn: waitingOn(status),
      isOverdue,
      sla,
      unverified,
    } as TaskRow;
  });
}

export async function buildWhere(f: TaskFilters, d: TaskDisplay, viewer: CurrentMember): Promise<Prisma.TaskWhereInput> {
  const and: Prisma.TaskWhereInput[] = [{ archivedAt: null }];
  const cfg = await getWorkspaceConfig();
  if (f.project.length) and.push({ project: { key: { in: f.project.map((p) => p.toUpperCase()) } } });
  if (f.status.length) and.push({ status: { in: f.status } });
  else if (!d.showClosed) and.push({ status: { in: OPEN_STATUSES } });
  if (f.type.length) and.push({ type: { in: f.type } });
  if (f.priority.length) and.push({ OR: [{ priority: { in: f.priority } }, { priority: null, suggestedPriority: { in: f.priority } }] });
  if (f.assignee.length) {
    const ids = f.assignee.filter((a) => a !== "none").map((a) => (a === "me" ? viewer.id : a));
    and.push({ OR: [...(ids.length ? [{ assigneeId: { in: ids } }] : []), ...(f.assignee.includes("none") ? [{ assigneeId: null }] : [])] });
  }
  if (f.requester.length) and.push({ requesterId: { in: f.requester.map((a) => (a === "me" ? viewer.id : a)) } });
  if (f.waiting.length) {
    const statuses: TaskStatus[] = [];
    if (f.waiting.includes("abg")) statuses.push("triage", "planned", "in_progress", "reopened");
    if (f.waiting.includes("vendoor")) statuses.push("needs_info", "shipped");
    and.push({ status: { in: statuses } });
  }
  const now = new Date();
  if (f.due === "overdue") and.push({ dueAt: { lt: now }, status: { in: ["triage", "needs_info", "planned", "in_progress", "reopened"] } });
  if (f.due === "today") and.push({ dueAt: { lte: endOfWorkingDay(cfg.calendar, localDateKey(now, cfg.calendar.tz)) } });
  if (f.due === "week") and.push({ dueAt: { lte: new Date(now.getTime() + 7 * 86400_000) } });
  if (f.created) and.push({ createdAt: { gte: new Date(now.getTime() - Number(f.created.replace("d", "")) * 86400_000) } });
  if (f.hasOccurrences) and.push({ occurrenceCount: { gt: 0 } });
  if (!d.showSubtasks) and.push({ parentId: null });
  if (f.q.trim()) {
    const q = f.q.trim();
    and.push({
      OR: [
        // contains is case-insensitive: the tables use a case-insensitive collation (utf8mb4_unicode_ci).
        { key: { equals: q.toUpperCase() } },
        { title: { contains: q } },
        { description: { contains: q } },
        { accounts: { array_contains: [q] } },
        { orderCodes: { array_contains: [q] } },
        { occurrences: { some: { OR: [{ orderCodes: { array_contains: [q] } }, { accounts: { array_contains: [q] } }] } } },
        { comments: { some: { body: { contains: q }, ...(viewer.side === "vendoor" ? { isInternal: false } : {}) } } },
      ],
    });
  }
  return { AND: and };
}

export function sortRows(rows: TaskRow[], order: TaskDisplay["order"]): TaskRow[] {
  const pr = (r: TaskRow) => PRIORITY_RANK[(r.priority ?? r.suggestedPriority ?? "low") as Priority] + (r.priority ? 0 : 0.5);
  const cmp: Record<TaskDisplay["order"], (a: TaskRow, b: TaskRow) => number> = {
    priority: (a, b) => pr(a) - pr(b) || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"),
    due: (a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  return [...rows].sort(cmp[order]);
}

export async function listTasks(f: TaskFilters, d: TaskDisplay, viewer: CurrentMember, take = 2000) {
  const where = await buildWhere(f, d, viewer);
  const rows = await db.task.findMany({ where, select: taskRowSelect, take, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] });
  let out = await decorate(rows);
  if (f.unverified) out = out.filter((r) => r.unverified);
  return sortRows(out, d.order);
}

export async function membersLite() {
  return db.member.findMany({
    where: { status: { not: "deactivated" } },
    select: { id: true, name: true, handle: true, role: true, team: { select: { side: true } } },
    orderBy: { name: "asc" },
  });
}

export async function projectsLite() {
  return db.project.findMany({
    where: { archivedAt: null },
    select: { id: true, key: true, name: true, categories: { where: { archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, name: true } } },
    orderBy: { position: "asc" },
  });
}

/** Tasks waiting on the viewer (PRD 6.1 FR-1.2): Waiting on = viewer's side and the viewer is involved. */
export async function waitingOnMe(viewer: CurrentMember) {
  const where: Prisma.TaskWhereInput =
    viewer.side === "vendoor"
      ? {
          archivedAt: null,
          status: { in: ["needs_info", "shipped"] },
          ...(viewer.role === "requester" ? { OR: [{ requesterId: viewer.id }, { followers: { some: { memberId: viewer.id, following: true } } }] } : {}),
        }
      : {
          archivedAt: null,
          OR: [
            { status: "triage" },
            { status: { in: ["planned", "in_progress", "reopened"] }, assigneeId: viewer.id },
            ...(viewer.role === "abg_lead" ? [{ status: { in: ["planned", "reopened"] as TaskStatus[] }, assigneeId: null }] : []),
          ],
        };
  const rows = await db.task.findMany({ where, select: taskRowSelect, take: 200, orderBy: [{ statusChangedAt: "asc" }, { id: "asc" }] });
  return decorate(rows);
}

/** Possible duplicates: open tasks in the same project with a similar title (trigram similarity, as pg_trgm). */
export async function possibleDuplicates(projectId: string | null, title: string, excludeId?: string) {
  const t = title.trim();
  if (t.length < 4) return [];
  const open = await db.task.findMany({
    where: { archivedAt: null, status: { notIn: ["done", "closed"] }, ...(projectId ? { projectId } : {}), ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, key: true, title: true, status: true, occurrenceCount: true },
  });
  return rankSimilar(open, t);
}
