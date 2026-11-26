import "server-only";
import { db } from "./db";
import type { CurrentMember } from "./session";

export interface DrawerItem {
  id: string;
  kind: string;
  at: string;
  read: boolean;
  actor: string | null;
  task: { id: string; key: string; title: string; status: string; requesterId: string; assigneeId: string | null; priority: string | null; suggestedPriority: string | null } | null;
  /** Incident number when the event is about a system problem. */
  incident: number | null;
  /** Incident id (for the Alert ABG button). */
  incidentId: string | null;
}

/** The viewer's latest in-app notifications for the bell drawer. */
export async function loadDrawer(me: CurrentMember, take = 60): Promise<DrawerItem[]> {
  const rows = await db.notification.findMany({
    where: { memberId: me.id, channel: "in_app" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    include: { event: { select: { actorId: true, subjectType: true, subjectId: true, meta: true } } },
  });
  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((x): x is string => !!x))];
  const actorIds = [...new Set(rows.map((r) => r.event.actorId).filter((x): x is string => !!x))];
  const [tasks, actors] = await Promise.all([
    db.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, key: true, title: true, status: true, requesterId: true, assigneeId: true, priority: true, suggestedPriority: true } }),
    db.member.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }),
  ]);
  const taskBy = new Map(tasks.map((t) => [t.id, t]));
  const actorBy = new Map(actors.map((a) => [a.id, a.name]));
  const incidentNumber = (meta: unknown) => (meta && typeof meta === "object" && "number" in meta ? Number((meta as { number: unknown }).number) : null);
  return rows.map((r) => {
    const t = r.taskId ? taskBy.get(r.taskId) : undefined;
    return {
      id: r.id,
      kind: r.kind,
      at: r.createdAt.toISOString(),
      read: !!r.readAt,
      actor: r.event.actorId ? (actorBy.get(r.event.actorId) ?? null) : null,
      task: t ?? null,
      incident: r.event.subjectType === "incident" ? incidentNumber(r.event.meta) : null,
      incidentId: r.event.subjectType === "incident" ? r.event.subjectId : null,
    };
  });
}
