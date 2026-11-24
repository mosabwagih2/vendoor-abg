import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export interface EventInput {
  actorId: string | null;
  subjectType: "task" | "comment" | "release" | "member" | "project" | "incident" | "credential" | "settings";
  subjectId: string;
  taskId?: string | null;
  verb: string;
  field?: string;
  from?: unknown;
  to?: unknown;
  isInternal?: boolean;
  meta?: Record<string, unknown>;
}

/** PRD rule 7: every status change, field change and comment writes an ActivityEvent. */
export async function recordEvent(tx: Tx, e: EventInput) {
  return tx.activityEvent.create({
    data: {
      actorId: e.actorId,
      subjectType: e.subjectType,
      subjectId: e.subjectId,
      taskId: e.taskId ?? null,
      verb: e.verb,
      field: e.field ?? null,
      fromValue: e.from === undefined ? undefined : (e.from as Prisma.InputJsonValue),
      toValue: e.to === undefined ? undefined : (e.to as Prisma.InputJsonValue),
      isInternal: e.isInternal ?? false,
      meta: e.meta as Prisma.InputJsonValue | undefined,
    },
  });
}
