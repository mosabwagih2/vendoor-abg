import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * PRD 7, Phase 1 events. Each kind lists whether email is sent (in-app is always on unless the member opted out).
 * Rules: never notify the actor; at most one email per task per person per 10 minutes.
 */
export const NOTIFICATION_KINDS = {
  "task.new_request": { email: false },
  "task.accepted": { email: true },
  "task.needs_info": { email: true },
  "task.answered": { email: false },
  "task.shipped": { email: true },
  "task.reopened": { email: true },
  "task.done": { email: false },
  "task.mentioned": { email: true },
  "task.commented": { email: false },
  "task.status_request": { email: true },
  "task.assigned": { email: true },
  "task.verify_reminder": { email: true },
  "task.cancel_proposed": { email: true },
  "release.recorded": { email: false },
} as const;

export type NotificationKind = keyof typeof NOTIFICATION_KINDS;

export interface NotifyInput {
  eventId: string;
  kind: NotificationKind;
  actorId: string | null;
  recipients: Array<string | null | undefined>;
  taskId?: string | null;
  email?: { subject: string; line: string; actionLabel: string; path: string };
  /** Internal events are only delivered to ABG members. */
  abgOnly?: boolean;
}

export async function notify(tx: Tx, n: NotifyInput) {
  const ids = [...new Set(n.recipients.filter((r): r is string => !!r && r !== n.actorId))];
  if (!ids.length) return;
  const members = await tx.member.findMany({
    where: { id: { in: ids }, status: { not: "deactivated" } },
    include: { team: true, notificationPrefs: { where: { event: n.kind } } },
  });
  const wantsEmail = NOTIFICATION_KINDS[n.kind].email;
  for (const m of members) {
    if (n.abgOnly && m.team.side !== "delivery") continue;
    const pref = m.notificationPrefs[0];
    if (pref?.inApp !== false) {
      await tx.notification.create({ data: { memberId: m.id, eventId: n.eventId, taskId: n.taskId ?? null, kind: n.kind, channel: "in_app" } });
    }
    if (wantsEmail && n.email && pref?.email !== false) {
      const recent = n.taskId
        ? await tx.notification.findFirst({
            where: { memberId: m.id, taskId: n.taskId, channel: "email", createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
          })
        : null;
      if (recent) continue;
      await tx.notification.create({ data: { memberId: m.id, eventId: n.eventId, taskId: n.taskId ?? null, kind: n.kind, channel: "email" } });
      await tx.job.create({
        data: {
          kind: "send_email",
          payload: {
            to: m.email,
            subject: n.email.subject,
            line: n.email.line,
            actionLabel: n.email.actionLabel,
            actionUrl: `${process.env.APP_URL ?? "http://localhost:3000"}${n.email.path}`,
          },
        },
      });
    }
  }
}
