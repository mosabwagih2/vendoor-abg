import "server-only";
import { db } from "../db";
import { recordEvent } from "../activity";
import { notify } from "../notify";
import { AppError } from "../errors";
import { can, type Actor } from "@/domain/policy";
import { getWorkspaceConfig } from "../calendar";
import { localDateKey } from "@/domain/sla";
import { refreshSla } from "./tasks";

/** R-YYYY-MM-DD, with -2, -3 … for further releases the same day (FR-11.2). */
export function releaseNumber(dateKey: string, existing: string[]): string {
  const base = `R-${dateKey}`;
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function nextReleaseNumber(at = new Date()) {
  const cfg = await getWorkspaceConfig();
  const key = localDateKey(at, cfg.calendar.tz);
  const existing = await db.release.findMany({ where: { number: { startsWith: `R-${key}` } }, select: { number: true } });
  return releaseNumber(key, existing.map((r) => r.number));
}

export interface RecordReleaseInput {
  releasedAt?: string | null;
  type: "planned" | "hotfix";
  notes: string;
  taskIds: string[];
  /** Turn an upcoming release into a recorded one. */
  upcomingId?: string | null;
}

/** Recording a release moves its tasks to Shipped and notifies requesters (PRD 4.5, FR-11.2). */
export async function recordRelease(actor: Actor, input: RecordReleaseInput) {
  if (!can(actor, "record_release")) throw new AppError("forbidden");
  const releasedAt = input.releasedAt ? new Date(input.releasedAt) : new Date();
  const number = await nextReleaseNumber(releasedAt);
  const cfg = await getWorkspaceConfig();
  return db.$transaction(async (tx) => {
    const tasks = await tx.task.findMany({ where: { id: { in: input.taskIds }, status: { in: ["in_progress", "shipped", "planned", "reopened"] } } });
    const release = input.upcomingId
      ? await tx.release.update({ where: { id: input.upcomingId }, data: { number, state: "released", releasedAt, type: input.type, notes: input.notes } })
      : await tx.release.create({ data: { number, state: "released", type: input.type, releasedAt, notes: input.notes, createdById: actor.id } });
    const ev = await recordEvent(tx, { actorId: actor.id, subjectType: "release", subjectId: release.id, verb: "release_recorded", meta: { number, tasks: tasks.length } });
    for (const t of tasks) {
      await tx.releaseTask.upsert({ where: { releaseId_taskId: { releaseId: release.id, taskId: t.id } }, create: { releaseId: release.id, taskId: t.id }, update: {} });
      if (t.status === "shipped") {
        await tx.task.update({ where: { id: t.id }, data: { currentReleaseId: release.id } });
        continue;
      }
      await tx.task.update({ where: { id: t.id }, data: { status: "shipped", statusChangedAt: releasedAt, shippedAt: releasedAt, currentReleaseId: release.id, verifyReminderSentAt: null } });
      await tx.taskStatusSpan.updateMany({ where: { taskId: t.id, leftAt: null }, data: { leftAt: releasedAt } });
      await tx.taskStatusSpan.create({ data: { taskId: t.id, status: "shipped", enteredAt: releasedAt, actorId: actor.id } });
      const tev = await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "status_changed", field: "status", from: t.status, to: "shipped", meta: { release: number } });
      const fol = await tx.follower.findMany({ where: { taskId: t.id, following: true }, select: { memberId: true } });
      await notify(tx, {
        eventId: tev.id,
        kind: "task.shipped",
        actorId: actor.id,
        recipients: [t.requesterId, ...fol.map((f) => f.memberId)],
        taskId: t.id,
        email: { subject: `[${t.key}] Shipped: please test`, line: `${t.key} is live. Please test.`, actionLabel: "Test and confirm", path: `/tasks/${t.key}` },
      });
      await refreshSla(tx, t.id, cfg);
    }
    void ev;
    return release;
  });
}

export async function createUpcomingRelease(actor: Actor, input: { targetDate: string; notes: string; taskIds: string[]; type: "planned" | "hotfix" }) {
  if (!can(actor, "record_release")) throw new AppError("forbidden");
  return db.$transaction(async (tx) => {
    const number = `Upcoming-${input.targetDate}-${Math.random().toString(36).slice(2, 6)}`;
    const r = await tx.release.create({
      data: { number, state: "upcoming", type: input.type, targetDate: new Date(`${input.targetDate}T16:00:00Z`), notes: input.notes, createdById: actor.id },
    });
    for (const id of input.taskIds) await tx.releaseTask.create({ data: { releaseId: r.id, taskId: id } });
    await recordEvent(tx, { actorId: actor.id, subjectType: "release", subjectId: r.id, verb: "release_planned", meta: { targetDate: input.targetDate } });
    return r;
  });
}
