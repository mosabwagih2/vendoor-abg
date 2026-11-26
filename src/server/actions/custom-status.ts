"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "../session";
import { runAction, AppError } from "../errors";
import { db } from "../db";
import { recordEvent } from "../activity";
import { can } from "@/domain/policy";
import { CUSTOM_GROUPS, STATUS_COLORS, checkName, stillValid } from "@/domain/custom-status";
import type { TaskStatus } from "@/domain/types";

const refresh = () => revalidatePath("/", "layout");
const color = z.enum(STATUS_COLORS);
const group = z.enum(CUSTOM_GROUPS as [string, ...string[]]);

async function requireManager() {
  const me = await requireMember();
  if (!can(me, "manage_sla")) throw new AppError("forbidden");
  return me;
}

async function assertName(name: string, stepGroup: string, selfId?: string) {
  const problem = checkName(name, stepGroup, await db.customStatus.findMany({ select: { id: true, stepGroup: true, name: true } }), selfId);
  if (problem) throw new AppError("invalid_input", problem);
}

/** "+ Add status" under a step. */
export async function addCustomStatusAction(input: { stepGroup: string; name: string; color: string }) {
  return runAction(async () => {
    const me = await requireManager();
    const d = z.object({ stepGroup: group, name: z.string(), color }).parse(input);
    await assertName(d.name, d.stepGroup);
    const last = await db.customStatus.findFirst({ where: { stepGroup: d.stepGroup }, orderBy: { position: "desc" } });
    const row = await db.customStatus.create({ data: { stepGroup: d.stepGroup, name: d.name.trim(), color: d.color, position: (last?.position ?? 0) + 1 } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "settings", subjectId: row.id, verb: "custom_status_added", to: { name: row.name, stepGroup: row.stepGroup } }));
    refresh();
    return { id: row.id };
  });
}

export async function updateCustomStatusAction(id: string, patch: { name?: string; color?: string }) {
  return runAction(async () => {
    const me = await requireManager();
    const cur = await db.customStatus.findUnique({ where: { id } });
    if (!cur) throw new AppError("not_found");
    const d = z.object({ name: z.string().optional(), color: color.optional() }).parse(patch);
    if (d.name !== undefined) await assertName(d.name, cur.stepGroup, id);
    await db.customStatus.update({ where: { id }, data: { ...(d.name !== undefined ? { name: d.name.trim() } : {}), ...(d.color ? { color: d.color } : {}) } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "settings", subjectId: id, verb: "custom_status_updated", to: d }));
    refresh();
  });
}

/** Deleting moves its tasks back to the step's default status (the foreign key sets their custom status to empty). */
export async function deleteCustomStatusAction(id: string) {
  return runAction(async () => {
    const me = await requireManager();
    const moved = await db.task.count({ where: { customStatusId: id } });
    await db.customStatus.delete({ where: { id } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "settings", subjectId: id, verb: "custom_status_deleted", meta: { moved } }));
    refresh();
    return { moved };
  });
}

/** ABG picks one of the step's custom statuses on a task (or none for the default). It never changes the real workflow status. */
export async function setTaskCustomStatusAction(taskKey: string, customStatusId: string | null) {
  return runAction(async () => {
    const me = await requireMember();
    if (me.side !== "abg") throw new AppError("forbidden");
    const task = await db.task.findUnique({ where: { key: taskKey }, select: { id: true, status: true } });
    if (!task) throw new AppError("not_found");
    if (customStatusId) {
      const cs = await db.customStatus.findUnique({ where: { id: customStatusId } });
      if (!cs || !stillValid(cs, task.status as TaskStatus)) throw new AppError("invalid_input", "step");
    }
    await db.$transaction(async (tx) => {
      await tx.task.update({ where: { id: task.id }, data: { customStatusId } });
      await recordEvent(tx, { actorId: me.id, subjectType: "task", subjectId: task.id, taskId: task.id, verb: "field_changed", field: "custom_status", to: customStatusId });
    });
    refresh();
  });
}
