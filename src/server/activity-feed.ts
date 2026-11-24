import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import type { CurrentMember } from "./session";

export interface FeedItem {
  id: string;
  at: string;
  verb: string;
  actor: string | null;
  key: string | null;
  field: string | null;
  from: unknown;
  to: unknown;
  isInternal: boolean;
  meta: Record<string, unknown> | null;
}

/** Activity visible to the viewer: internal events (ABG notes, password reveals) are hidden from Vendoor. */
export async function activityFeed(viewer: CurrentMember, where: Prisma.ActivityEventWhereInput, take = 15): Promise<FeedItem[]> {
  const rows = await db.activityEvent.findMany({
    where: { ...where, ...(viewer.side === "vendoor" ? { isInternal: false } : {}) },
    orderBy: { at: "desc" },
    take,
    include: { actor: { select: { name: true } } },
  });
  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((x): x is string => !!x))];
  const tasks = await db.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, key: true } });
  const keyOf = new Map(tasks.map((t) => [t.id, t.key]));
  return rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    verb: r.verb,
    actor: r.actor?.name ?? null,
    key: r.taskId ? (keyOf.get(r.taskId) ?? null) : null,
    field: r.field,
    from: r.fromValue,
    to: r.toValue,
    isInternal: r.isInternal,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
  }));
}
