"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "../session";
import { runAction, AppError } from "../errors";
import { db } from "../db";
import { decryptSecret } from "../crypto";
import { recordEvent } from "../activity";
import * as svc from "../services/tasks";
import { possibleDuplicates } from "../queries";
import { WORKFLOW_ACTIONS } from "@/domain/workflow";
import { PRIORITIES, TASK_TYPES } from "@/domain/types";
import { can } from "@/domain/policy";

const attachment = z.object({ key: z.string(), fileName: z.string().max(255), mime: z.string().max(200), size: z.number().int().positive().max(100 * 1024 * 1024), durationSec: z.number().nullable().optional() });
const credential = z.object({ label: z.string().max(120).nullish(), username: z.string().max(300), password: z.string().max(500).nullish(), url: z.string().max(1000).nullish(), note: z.string().max(1000).nullish() });

const createSchema = z.object({
  type: z.enum(TASK_TYPES),
  projectId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  title: z.string().max(300),
  description: z.string().max(50_000).optional(),
  currentBehaviour: z.string().max(20_000).nullish(),
  expectedBehaviour: z.string().max(20_000).nullish(),
  whyItMatters: z.string().max(20_000).nullish(),
  howOften: z.enum(["once", "sometimes", "always"]).nullish(),
  isOrderRelated: z.boolean().optional(),
  accounts: z.array(z.string().max(300)).max(100).optional(),
  orderCodes: z.array(z.string().max(100)).max(500).optional(),
  suggestedPriority: z.enum(PRIORITIES).nullish(),
  requesterId: z.string().uuid().nullish(),
  attachments: z.array(attachment).max(30).optional(),
  credentials: z.array(credential).max(10).optional(),
  parentId: z.string().uuid().nullish(),
  subtaskTitles: z.array(z.string().max(300)).max(50).optional(),
  guardOverride: z.boolean().optional(),
});

function refresh() {
  revalidatePath("/", "layout");
}

export async function createRequestAction(input: z.input<typeof createSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const data = createSchema.parse(input);
    const task = await svc.createRequest(me, data);
    for (const title of (data.subtaskTitles ?? []).map((s) => s.trim()).filter(Boolean)) {
      await svc.createRequest(me, { type: data.type, projectId: data.projectId, title, parentId: task.id });
    }
    refresh();
    return { key: task.key };
  });
}

export async function createSubtasksAction(parentId: string, titles: string[]) {
  return runAction(async () => {
    const me = await requireMember();
    const parent = await db.task.findUniqueOrThrow({ where: { id: parentId } });
    if (!can(me, "manage_subtasks", { status: parent.status, requesterId: parent.requesterId, assigneeId: parent.assigneeId })) throw new AppError("forbidden");
    for (const title of titles.map((s) => s.trim()).filter(Boolean)) {
      await svc.createRequest(me, { type: parent.type, projectId: parent.projectId, title: title.slice(0, 300), parentId });
    }
    refresh();
  });
}

const transitionSchema = z.object({
  taskId: z.string().uuid(),
  action: z.enum(WORKFLOW_ACTIONS),
  comment: z.string().max(20_000).optional(),
  reason: z.string().max(5000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullish(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  targetTaskId: z.string().uuid().optional(),
  releaseId: z.string().uuid().nullish(),
  attachments: z.array(attachment).max(20).optional(),
});

export async function transitionAction(input: z.input<typeof transitionSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const { taskId, action, ...rest } = transitionSchema.parse(input);
    const r = await svc.transition(me, taskId, action, rest);
    refresh();
    return r;
  });
}

export async function undoTransitionAction(taskId: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.undoLastTransition(me, z.string().uuid().parse(taskId));
    refresh();
  });
}

export async function proposeCancelAction(taskId: string, reason: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.proposeCancel(me, taskId, reason);
    refresh();
  });
}

const fieldSchema = z.object({
  taskId: z.string().uuid(),
  field: z.enum(["title", "description", "priority", "suggestedPriority", "assigneeId", "dueDate", "type", "projectId", "categoryId", "accounts", "orderCodes", "decisionText"]),
  value: z.unknown(),
});

export async function updateFieldAction(input: z.input<typeof fieldSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const { taskId, field, value } = fieldSchema.parse(input);
    const r = await svc.updateField(me, taskId, field, value);
    refresh();
    return r;
  });
}

const bulkSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(500),
  op: z.enum(["priority", "assigneeId", "dueDate", "projectId", "close", "verify"]),
  value: z.string().nullish(),
});

/** FR-5.6 bulk actions. Each row is checked on its own; the result reports what was not allowed. */
export async function bulkAction(input: z.input<typeof bulkSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const { taskIds, op, value } = bulkSchema.parse(input);
    let ok = 0;
    let failed = 0;
    for (const id of taskIds) {
      try {
        if (op === "verify") await svc.transition(me, id, "verify");
        else if (op === "close") await svc.transition(me, id, "cancel", { reason: value || "Closed in bulk" });
        else await svc.updateField(me, id, op, value ?? null);
        ok++;
      } catch {
        failed++;
      }
    }
    refresh();
    return { ok, failed };
  });
}

const commentSchema = z.object({
  taskId: z.string().uuid(),
  body: z.string().max(20_000),
  isInternal: z.boolean().optional(),
  kind: z.enum(["comment", "status_request"]).optional(),
  attachments: z.array(attachment).max(20).optional(),
  mentions: z.array(z.string().uuid()).max(20).optional(),
  guardOverride: z.boolean().optional(),
});

export async function addCommentAction(input: z.input<typeof commentSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const data = commentSchema.parse(input);
    await svc.addComment(me, data.taskId, data);
    refresh();
  });
}

export async function editCommentAction(commentId: string, body: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.editComment(me, z.string().uuid().parse(commentId), z.string().min(1).max(20_000).parse(body));
    refresh();
  });
}

export async function toggleReactionAction(commentId: string, emoji: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.toggleReaction(me, z.string().uuid().parse(commentId), z.string().max(8).parse(emoji));
    refresh();
  });
}

const occSchema = z.object({
  taskId: z.string().uuid(),
  accounts: z.array(z.string().max(300)).max(50).optional(),
  orderCodes: z.array(z.string().max(100)).max(200).optional(),
  happenedAt: z.string().nullish(),
  note: z.string().max(10_000).nullish(),
  attachments: z.array(attachment).max(20).optional(),
});

export async function addOccurrenceAction(input: z.input<typeof occSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const { taskId, ...rest } = occSchema.parse(input);
    const occ = await svc.addOccurrence(me, taskId, rest);
    refresh();
    const t = await db.task.findUnique({ where: { id: taskId }, select: { key: true } });
    return { id: occ.id, key: t?.key };
  });
}

export async function addRelationAction(taskId: string, toKey: string, kind: "related" | "blocks" | "duplicate_of") {
  return runAction(async () => {
    const me = await requireMember();
    await svc.addRelation(me, taskId, toKey, z.enum(["related", "blocks", "duplicate_of"]).parse(kind));
    refresh();
  });
}

export async function removeRelationAction(relationId: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.removeRelation(me, relationId);
    refresh();
  });
}

export async function setFollowAction(taskId: string, following: boolean) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.setFollow(me, taskId, following);
    refresh();
  });
}

export async function duplicatesAction(projectId: string | null, title: string, excludeId?: string) {
  await requireMember();
  return possibleDuplicates(projectId, title, excludeId);
}

// ───────────── Account access ─────────────

export async function addCredentialAction(taskId: string, input: z.input<typeof credential>) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.addCredential(me, z.string().uuid().parse(taskId), credential.parse(input));
    refresh();
  });
}

export async function updateCredentialAction(id: string, input: z.input<typeof credential>) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.updateCredential(me, z.string().uuid().parse(id), credential.parse(input));
    refresh();
  });
}

export async function archiveCredentialAction(id: string) {
  return runAction(async () => {
    const me = await requireMember();
    await svc.archiveCredential(me, z.string().uuid().parse(id));
    refresh();
  });
}
