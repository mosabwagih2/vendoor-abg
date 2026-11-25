import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { decorate, taskRowSelect, type TaskRow } from "./queries";
import type { CurrentMember } from "./session";
import { inboxHint, type InboxHint } from "@/domain/inbox";
import { OPEN_STATUSES } from "@/domain/workflow";

export interface InboxRow extends TaskRow {
  /** The viewer has an unread notification about this task. */
  unread: boolean;
  hint: InboxHint;
}

/** Open tasks the viewer is involved in: Vendoor requesters see their own, admins see all; ABG sees what is theirs or waiting for triage. */
function involvedWhere(me: CurrentMember): Prisma.TaskWhereInput {
  const open: Prisma.TaskWhereInput = { archivedAt: null, status: { in: OPEN_STATUSES }, parentId: null };
  if (me.side === "vendoor") {
    return me.role === "requester" ? { ...open, OR: [{ requesterId: me.id }, { followers: { some: { memberId: me.id, following: true } } }] } : open;
  }
  return { ...open, OR: [{ status: "triage" }, { assigneeId: me.id }, ...(me.role === "abg_lead" ? [{ assigneeId: null }] : [])] };
}

/** Everything the Inbox list needs, newest activity first. */
export async function loadInbox(me: CurrentMember): Promise<InboxRow[]> {
  const [tasks, unread] = await Promise.all([
    db.task.findMany({ where: involvedWhere(me), select: taskRowSelect, orderBy: { statusChangedAt: "desc" }, take: 300 }),
    db.notification.findMany({ where: { memberId: me.id, channel: "in_app", readAt: null, taskId: { not: null } }, select: { taskId: true } }),
  ]);
  const unreadIds = new Set(unread.map((n) => n.taskId));
  const rows = await decorate(tasks);
  return rows.map((r) => ({ ...r, unread: unreadIds.has(r.id), hint: inboxHint(r, me.side) }));
}

/** Opening a task in the Inbox reads its notifications. */
export async function markTaskNotificationsRead(me: CurrentMember, taskId: string) {
  await db.notification.updateMany({ where: { memberId: me.id, taskId, readAt: null }, data: { readAt: new Date() } });
}
