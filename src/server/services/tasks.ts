import { statusGroup } from "@/domain/status-display";
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { recordEvent } from "../activity";
import { notify } from "../notify";
import { AppError } from "../errors";
import { getWorkspaceConfig, type WorkspaceConfig } from "../calendar";
import { encryptSecret } from "../crypto";
import { can, canAssign, checkAction, type Actor } from "@/domain/policy";
import { addWorkingMinutes, computeClock, pausesFromSpans, endOfWorkingDay } from "@/domain/sla";
import { resolveTarget, SLA_PAUSE_STATUSES, TRANSITIONS, type WorkflowAction } from "@/domain/workflow";
import { isAbg, type Priority, type TaskStatus, type TaskType } from "@/domain/types";
import { analyzeText } from "@/domain/credential-guard";
import { missingFields } from "@/domain/request-fields";

type Tx = Prisma.TransactionClient;

// ───────────────────────────── helpers ─────────────────────────────

export async function findTaskByKey(key: string, tx: Tx | typeof db = db) {
  const k = key.toUpperCase();
  const task = await tx.task.findUnique({ where: { key: k } });
  if (task) return task;
  const alias = await tx.taskKeyAlias.findUnique({ where: { key: k } });
  if (alias) return tx.task.findUnique({ where: { id: alias.taskId } });
  return null;
}

async function getTaskOrThrow(tx: Tx, id: string) {
  const t = await tx.task.findUnique({ where: { id } });
  if (!t || t.archivedAt) throw new AppError("not_found", "Task not found");
  return t;
}

async function allocateKey(tx: Tx, projectId: string) {
  // Atomic increment: concurrent creates in the same project never share a number.
  const p = await tx.project.update({ where: { id: projectId }, data: { nextTaskNumber: { increment: 1 } } });
  const number = p.nextTaskNumber - 1;
  return { number, key: `${p.key}-${number}` };
}

async function follow(tx: Tx, taskId: string, memberId: string | null | undefined, source: string) {
  if (!memberId) return;
  const existing = await tx.follower.findUnique({ where: { taskId_memberId: { taskId, memberId } } });
  if (existing) return; // respects explicit unfollow
  await tx.follower.create({ data: { taskId, memberId, source } });
}

async function followers(tx: Tx, taskId: string): Promise<string[]> {
  const f = await tx.follower.findMany({ where: { taskId, following: true }, select: { memberId: true } });
  return f.map((x) => x.memberId);
}

async function abgLeads(tx: Tx): Promise<string[]> {
  const m = await tx.member.findMany({ where: { role: "abg_lead", status: { not: "deactivated" } }, select: { id: true } });
  return m.map((x) => x.id);
}

async function abgAll(tx: Tx): Promise<string[]> {
  const m = await tx.member.findMany({ where: { role: { in: ["abg_lead", "abg_member"] }, status: { not: "deactivated" } }, select: { id: true } });
  return m.map((x) => x.id);
}

/** Recompute stored SLA due dates from status history (PRD 4.3: working hours only, paused in Needs info; resolution also paused while Shipped). */
export async function refreshSla(tx: Tx, taskId: string, cfg?: WorkspaceConfig) {
  const c = cfg ?? (await getWorkspaceConfig());
  const t = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
  const spans = await tx.taskStatusSpan.findMany({ where: { taskId }, orderBy: { enteredAt: "asc" } });
  const prio = (t.priority ?? t.suggestedPriority ?? "medium") as Priority;
  const target = c.targets[prio];
  const now = new Date();
  const fr = computeClock({
    calendar: c.calendar,
    targetMinutes: target?.firstResponse ?? null,
    clockStart: t.slaClockStartedAt,
    pauses: pausesFromSpans(spans, ["needs_info"]),
    completedAt: t.firstResponseAt,
    now,
  });
  const res = computeClock({
    calendar: c.calendar,
    targetMinutes: t.priority ? (target?.resolution ?? null) : null,
    clockStart: t.slaClockStartedAt,
    pauses: pausesFromSpans(spans, SLA_PAUSE_STATUSES),
    completedAt: t.status === "done" ? (t.shippedAt ?? t.verifiedAt) : null,
    now,
  });
  await tx.task.update({
    where: { id: taskId },
    data: { slaFirstResponseDueAt: fr.dueAt, slaResolutionDueAt: res.dueAt },
  });
}

async function setStatus(tx: Tx, taskId: string, from: TaskStatus, to: TaskStatus, actorId: string | null, at: Date) {
  await tx.taskStatusSpan.updateMany({ where: { taskId, leftAt: null }, data: { leftAt: at } });
  await tx.taskStatusSpan.create({ data: { taskId, status: to, enteredAt: at, actorId } });
  return { from, to };
}

// ───────────────────────────── create ─────────────────────────────

export interface AttachmentRef {
  key: string;
  fileName: string;
  mime: string;
  size: number;
  durationSec?: number | null;
}

export interface CredentialInput {
  label?: string | null;
  username: string;
  password?: string | null;
  url?: string | null;
  note?: string | null;
}

export interface CreateRequestInput {
  type: TaskType;
  projectId: string;
  categoryId?: string | null;
  title: string;
  description?: string;
  currentBehaviour?: string | null;
  expectedBehaviour?: string | null;
  whyItMatters?: string | null;
  howOften?: "once" | "sometimes" | "always" | null;
  isOrderRelated?: boolean;
  accounts?: string[];
  orderCodes?: string[];
  suggestedPriority?: Priority | null;
  requesterId?: string | null; // filing on behalf (PRD 11.2.6)
  attachments?: AttachmentRef[];
  credentials?: CredentialInput[];
  parentId?: string | null;
  guardOverride?: boolean;
}

/** PRD 6.7 table: required fields per type (shared with the client form). */
export function validateRequest(i: CreateRequestInput): string[] {
  return missingFields(i);
}

export async function createRequest(actor: Actor, input: CreateRequestInput) {
  if (!can(actor, "create_request")) throw new AppError("forbidden");
  const errs = validateRequest(input);
  if (errs.length) throw new AppError("invalid_input", errs.join(","));
  const cfg = await getWorkspaceConfig();
  const texts = [input.title, input.description, input.currentBehaviour, input.expectedBehaviour, input.whyItMatters].filter(Boolean).join("\n");
  const guard = analyzeText(texts);

  return db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: input.projectId } });
    if (!project || project.archivedAt) throw new AppError("invalid_input", "project");
    const { number, key } = await allocateKey(tx, project.id);
    const now = new Date();
    const requesterId = input.requesterId && actor.role !== "requester" ? input.requesterId : actor.id;
    // Sub-tasks skip triage when ABG creates them.
    const status: TaskStatus = input.parentId && isAbg(actor.role) ? "planned" : "triage";
    const task = await tx.task.create({
      data: {
        projectId: project.id,
        number,
        key,
        title: input.title.trim(),
        description: input.description ?? "",
        type: input.type,
        status,
        statusChangedAt: now,
        suggestedPriority: input.suggestedPriority ?? null,
        priority: status === "planned" ? (input.suggestedPriority ?? "medium") : null,
        categoryId: input.categoryId ?? null,
        requesterId,
        createdById: actor.id,
        parentId: input.parentId ?? null,
        currentBehaviour: input.currentBehaviour ?? null,
        expectedBehaviour: input.expectedBehaviour ?? null,
        whyItMatters: input.whyItMatters ?? null,
        howOften: input.howOften ?? null,
        isOrderRelated: !!input.isOrderRelated,
        accounts: dedupe(input.accounts),
        orderCodes: dedupe(input.orderCodes),
        slaClockStartedAt: now,
        attachmentCount: input.attachments?.length ?? 0,
      },
    });
    await tx.taskStatusSpan.create({ data: { taskId: task.id, status, enteredAt: now, actorId: actor.id } });
    for (const a of input.attachments ?? []) await createAttachment(tx, actor.id, a, { taskId: task.id });
    for (const c of input.credentials ?? []) await addCredentialTx(tx, actor, task.id, c);
    await follow(tx, task.id, requesterId, "requester");
    if (requesterId !== actor.id) await follow(tx, task.id, actor.id, "creator");
    const ev = await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: task.id, taskId: task.id, verb: "created", to: { status, key } });
    if (guard.level !== "none" && input.guardOverride) {
      await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: task.id, taskId: task.id, verb: "credential_guard_override", isInternal: true, meta: { level: guard.level } });
    }
    if (status === "triage") {
      await notify(tx, { eventId: ev.id, kind: "task.new_request", actorId: actor.id, recipients: await abgAll(tx), taskId: task.id });
    }
    await refreshSla(tx, task.id, cfg);
    return task;
  });
}

function dedupe(a?: string[]): string[] {
  return [...new Set((a ?? []).map((s) => s.trim()).filter(Boolean))];
}

export async function createAttachment(tx: Tx, uploaderId: string, a: AttachmentRef, owner: { taskId?: string; commentId?: string; occurrenceId?: string; incidentId?: string }) {
  // Keys are minted per uploader by /api/uploads; refuse keys that belong to someone else.
  if (!a.key.startsWith(`uploads/${uploaderId}/`)) throw new AppError("forbidden", "attachment");
  const isMedia = a.mime.startsWith("audio/") || a.mime.startsWith("video/") || /\.(opus|ogg|mov|m4a|webm)$/i.test(a.fileName);
  const att = await tx.attachment.create({
    data: {
      ...owner,
      uploadedById: uploaderId,
      storageKey: a.key,
      fileName: a.fileName,
      mime: a.mime || "application/octet-stream",
      size: BigInt(a.size),
      durationSec: a.durationSec ?? null,
      processingState: isMedia ? "pending" : "ready",
    },
  });
  if (isMedia) await tx.job.create({ data: { kind: "process_media", payload: { attachmentId: att.id } } });
  return att;
}

// ───────────────────────────── workflow transitions ─────────────────────────────

export interface TransitionInput {
  comment?: string;
  reason?: string;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null; // YYYY-MM-DD (Cairo)
  targetTaskId?: string;
  releaseId?: string | null;
  attachments?: AttachmentRef[];
}

export async function transition(actor: Actor, taskId: string, action: WorkflowAction, input: TransitionInput = {}) {
  const cfg = await getWorkspaceConfig();
  return db.$transaction(async (tx) => {
    const t = await getTaskOrThrow(tx, taskId);
    const check = checkAction(actor, action, { status: t.status as TaskStatus, requesterId: t.requesterId, assigneeId: t.assigneeId });
    if (!check.ok) throw new AppError(check.reason, check.reason === "forbidden" ? "You can't do this on this task." : "This action is not available in the current status.");
    const tr = TRANSITIONS[action];
    if (tr.requires.includes("comment") && !input.comment?.trim()) throw new AppError("invalid_input", "comment");
    if (tr.requires.includes("reason") && !input.reason?.trim()) throw new AppError("invalid_input", "reason");
    if (tr.requires.includes("target") && !input.targetTaskId) throw new AppError("invalid_input", "target");

    const now = new Date();
    const from = t.status as TaskStatus;
    const to = resolveTarget(action, (t.previousStatus as TaskStatus | null) ?? null);
    const data: Prisma.TaskUpdateInput = { status: to, statusChangedAt: now };
    // A custom status belongs to one step, so it ends when the task moves to another step.
    if (statusGroup(from) !== statusGroup(to)) data.customStatus = { disconnect: true };
    const isFirstResponse = !t.firstResponseAt && ["accept", "ask_info", "decline", "merge"].includes(action);
    if (isFirstResponse) data.firstResponseAt = now;

    let kind: Parameters<typeof notify>[1]["kind"] | null = null;
    let recipients: Array<string | null> = [];
    let email: Parameters<typeof notify>[1]["email"];
    const path = `/tasks/${t.key}`;

    switch (action) {
      case "accept": {
        const priority = input.priority ?? (t.suggestedPriority as Priority | null) ?? "medium";
        const assigneeId = input.assigneeId ?? actor.id;
        if (!canAssign(actor, assigneeId)) throw new AppError("forbidden", "ABG members can only assign themselves.");
        data.priority = priority;
        data.assignee = { connect: { id: assigneeId } };
        // Due date: chosen date, else the SLA resolution target (PRD 4.3).
        if (input.dueDate) data.dueAt = endOfWorkingDay(cfg.calendar, input.dueDate);
        else {
          const res = cfg.targets[priority]?.resolution;
          data.dueAt = res ? addWorkingMinutes(cfg.calendar, now, res) : null;
        }
        await follow(tx, t.id, assigneeId, "assignee");
        kind = "task.accepted";
        recipients = [t.requesterId];
        email = { subject: `[${t.key}] Accepted`, line: `${t.key} "${t.title}" was accepted.`, actionLabel: "Open task", path };
        break;
      }
      case "ask_info": {
        data.previousStatus = from;
        await tx.comment.create({ data: { taskId: t.id, authorId: actor.id, kind: "ask_info", body: input.comment!.trim() } });
        kind = "task.needs_info";
        recipients = [t.requesterId];
        email = { subject: `[${t.key}] Needs info: please answer`, line: `ABG asked a question on ${t.key} "${t.title}".`, actionLabel: "Answer", path };
        break;
      }
      case "answer": {
        data.previousStatus = null;
        await tx.comment.create({ data: { taskId: t.id, authorId: actor.id, kind: "answer", body: input.comment!.trim() } });
        kind = "task.answered";
        recipients = [t.assigneeId, ...(t.assigneeId ? [] : await abgLeads(tx))];
        break;
      }
      case "decline":
      case "cancel": {
        data.closeReason = tr.closeReason;
        data.closeNote = input.reason!.trim();
        data.closedAt = now;
        data.cancelProposedById = null;
        data.cancelProposedReason = null;
        await tx.comment.create({ data: { taskId: t.id, authorId: actor.id, kind: "close_note", body: input.reason!.trim() } });
        recipients = await followers(tx, t.id);
        kind = "task.commented";
        break;
      }
      case "merge": {
        await mergeInto(tx, actor, t, input.targetTaskId!);
        data.closeReason = "duplicate";
        data.closedAt = now;
        break;
      }
      case "start": {
        if (!t.assigneeId) data.assignee = { connect: { id: actor.id } };
        break;
      }
      case "ship": {
        data.shippedAt = now;
        data.verifyReminderSentAt = null;
        if (input.releaseId) {
          data.currentRelease = { connect: { id: input.releaseId } };
          await tx.releaseTask.upsert({
            where: { releaseId_taskId: { releaseId: input.releaseId, taskId: t.id } },
            create: { releaseId: input.releaseId, taskId: t.id },
            update: {},
          });
        }
        kind = "task.shipped";
        recipients = [t.requesterId, ...(await followers(tx, t.id))];
        email = { subject: `[${t.key}] Shipped: please test`, line: `${t.key} "${t.title}" is live. Please test it and confirm.`, actionLabel: "Test and confirm", path };
        break;
      }
      case "verify": {
        data.verifiedAt = now;
        data.verifiedBy = { connect: { id: actor.id } };
        if (input.comment?.trim()) await tx.comment.create({ data: { taskId: t.id, authorId: actor.id, kind: "verify_note", body: input.comment.trim() } });
        kind = "task.done";
        recipients = [t.assigneeId, ...(await followers(tx, t.id))];
        break;
      }
      case "reopen": {
        data.reopenCount = { increment: 1 };
        data.verifiedAt = null;
        const c = await tx.comment.create({ data: { taskId: t.id, authorId: actor.id, kind: "reopen_note", body: input.comment!.trim() } });
        for (const a of input.attachments ?? []) await createAttachment(tx, actor.id, a, { commentId: c.id });
        kind = "task.reopened";
        recipients = [t.assigneeId, ...(await abgLeads(tx))];
        email = { subject: `[${t.key}] Still broken: reopened`, line: `${t.key} "${t.title}" failed verification and was reopened.`, actionLabel: "Open task", path };
        break;
      }
    }

    await tx.task.update({ where: { id: t.id }, data });
    await setStatus(tx, t.id, from, to, actor.id, now);
    const ev = await recordEvent(tx, {
      actorId: actor.id,
      subjectType: "task",
      subjectId: t.id,
      taskId: t.id,
      verb: action === "verify" ? "verified" : action === "reopen" ? "reopened" : "status_changed",
      field: "status",
      from,
      to,
      meta: { action, reason: input.reason ?? undefined },
    });
    if (action === "accept") {
      const after = await tx.task.findUniqueOrThrow({ where: { id: t.id } });
      await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "field_changed", field: "priority", from: t.priority, to: after.priority });
      await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "field_changed", field: "assignee", from: t.assigneeId, to: after.assigneeId });
      await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "field_changed", field: "dueAt", from: t.dueAt, to: after.dueAt });
    }
    if (kind) await notify(tx, { eventId: ev.id, kind, actorId: actor.id, recipients, taskId: t.id, email });
    await refreshSla(tx, t.id, cfg);
    return { key: t.key, from, to };
  });
}

async function mergeInto(tx: Tx, actor: Actor, source: { id: string; key: string; requesterId: string; accounts: string[]; orderCodes: string[]; description: string; currentBehaviour: string | null; title: string; createdAt: Date }, targetId: string) {
  const target = await tx.task.findUnique({ where: { id: targetId } });
  if (!target || target.id === source.id) throw new AppError("invalid_input", "target");
  if (target.status === "closed") throw new AppError("invalid_input", "Target task is closed.");
  // The request becomes an occurrence of the target (FR-4.2), with its attachments.
  const occ = await tx.occurrence.create({
    data: {
      taskId: target.id,
      reportedById: source.requesterId,
      accounts: source.accounts,
      orderCodes: source.orderCodes,
      happenedAt: source.createdAt,
      note: [`Merged from ${source.key}: ${source.title}`, source.currentBehaviour, source.description].filter(Boolean).join("\n\n"),
      mergedFromTaskId: source.id,
    },
  });
  const moved = await tx.attachment.updateMany({ where: { taskId: source.id }, data: { taskId: null, occurrenceId: occ.id } });
  await tx.task.update({ where: { id: source.id }, data: { attachmentCount: 0 } });
  await tx.task.update({ where: { id: target.id }, data: { occurrenceCount: { increment: 1 }, accounts: dedupe([...target.accounts, ...source.accounts]), orderCodes: dedupe([...target.orderCodes, ...source.orderCodes]) } });
  // Followers move to the target (PRD 4.2 rule 4).
  const fs = await tx.follower.findMany({ where: { taskId: source.id, following: true } });
  for (const f of fs) await follow(tx, target.id, f.memberId, f.source);
  await tx.taskRelation.upsert({
    where: { fromTaskId_toTaskId_kind: { fromTaskId: source.id, toTaskId: target.id, kind: "duplicate_of" } },
    create: { fromTaskId: source.id, toTaskId: target.id, kind: "duplicate_of", createdById: actor.id },
    update: {},
  });
  await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: target.id, taskId: target.id, verb: "occurrence_added", meta: { mergedFrom: source.key, attachments: moved.count } });
}

/** ABG Lead proposes cancel (PRD 3.3 "Propose"); Vendoor then confirms with a normal cancel. */
export async function proposeCancel(actor: Actor, taskId: string, reason: string) {
  if (!can(actor, "propose_cancel")) throw new AppError("forbidden");
  if (!reason.trim()) throw new AppError("invalid_input", "reason");
  return db.$transaction(async (tx) => {
    const t = await getTaskOrThrow(tx, taskId);
    await tx.task.update({ where: { id: t.id }, data: { cancelProposedById: actor.id, cancelProposedReason: reason.trim() } });
    const ev = await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "cancel_proposed", meta: { reason } });
    await notify(tx, { eventId: ev.id, kind: "task.cancel_proposed", actorId: actor.id, recipients: [t.requesterId], taskId: t.id, email: { subject: `[${t.key}] ABG proposes to cancel`, line: `ABG proposes to cancel ${t.key}: ${reason}`, actionLabel: "Review", path: `/tasks/${t.key}` } });
  });
}

/** Undo the actor's own last status change within 10 seconds (PRD 9.5.3). */
export async function undoLastTransition(actor: Actor, taskId: string) {
  return db.$transaction(async (tx) => {
    const spans = await tx.taskStatusSpan.findMany({ where: { taskId }, orderBy: { enteredAt: "desc" }, take: 2 });
    const [current, prev] = spans;
    if (!current || !prev || current.actorId !== actor.id || Date.now() - current.enteredAt.getTime() > 10_000) {
      throw new AppError("conflict", "Too late to undo. Use the task actions instead.");
    }
    const t = await getTaskOrThrow(tx, taskId);
    const now = new Date();
    const data: Prisma.TaskUpdateInput = { status: prev.status, statusChangedAt: now };
    if (t.status === "done") Object.assign(data, { verifiedAt: null, verifiedBy: { disconnect: true } });
    if (t.status === "reopened") data.reopenCount = { decrement: 1 };
    if (t.status === "closed") Object.assign(data, { closeReason: null, closeNote: null, closedAt: null });
    if (t.status === "shipped") data.shippedAt = null;
    await tx.task.update({ where: { id: taskId }, data });
    await setStatus(tx, taskId, t.status as TaskStatus, prev.status as TaskStatus, actor.id, now);
    await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: taskId, taskId, verb: "status_changed", field: "status", from: t.status, to: prev.status, meta: { undo: true } });
    await refreshSla(tx, taskId);
  });
}

// ───────────────────────────── field edits ─────────────────────────────

export type EditableField =
  | "title"
  | "description"
  | "priority"
  | "suggestedPriority"
  | "assigneeId"
  | "dueDate"
  | "type"
  | "projectId"
  | "categoryId"
  | "accounts"
  | "orderCodes"
  | "decisionText";

export async function updateField(actor: Actor, taskId: string, field: EditableField, value: unknown) {
  const cfg = await getWorkspaceConfig();
  return db.$transaction(async (tx) => {
    const t = await getTaskOrThrow(tx, taskId);
    const ctx = { status: t.status as TaskStatus, requesterId: t.requesterId, assigneeId: t.assigneeId };
    const data: Prisma.TaskUpdateInput = {};
    let from: unknown;
    let to: unknown = value;
    switch (field) {
      case "title":
      case "description": {
        if (!can(actor, "edit_task", ctx)) throw new AppError("forbidden");
        const v = String(value ?? "");
        if (field === "title" && !v.trim()) throw new AppError("invalid_input", "title");
        from = t[field];
        data[field] = v;
        if (field === "description") await tx.descriptionVersion.create({ data: { taskId: t.id, authorId: actor.id, body: t.description } });
        break;
      }
      case "decisionText": {
        if (!can(actor, "edit_decision", ctx)) throw new AppError("forbidden");
        from = t.decisionText;
        data.decisionText = value ? String(value) : null;
        data.decisionUpdatedAt = new Date();
        data.decisionUpdatedById = actor.id;
        break;
      }
      case "priority": {
        if (!can(actor, "set_priority", ctx)) throw new AppError("forbidden", "Requesters can only suggest a priority.");
        from = t.priority;
        data.priority = value as Priority | null;
        break;
      }
      case "suggestedPriority": {
        from = t.suggestedPriority;
        data.suggestedPriority = value as Priority | null;
        break;
      }
      case "assigneeId": {
        if (!can(actor, "set_assignee", ctx) || !canAssign(actor, (value as string) ?? null)) throw new AppError("forbidden");
        from = t.assigneeId;
        data.assignee = value ? { connect: { id: String(value) } } : { disconnect: true };
        if (value) await follow(tx, t.id, String(value), "assignee");
        break;
      }
      case "dueDate": {
        if (!can(actor, "set_due", ctx)) throw new AppError("forbidden");
        from = t.dueAt;
        data.dueAt = value ? endOfWorkingDay(cfg.calendar, String(value)) : null;
        to = data.dueAt;
        break;
      }
      case "type": {
        if (!can(actor, "edit_task", ctx)) throw new AppError("forbidden");
        from = t.type;
        data.type = value as TaskType;
        break;
      }
      case "categoryId": {
        if (!can(actor, "edit_task", ctx)) throw new AppError("forbidden");
        from = t.categoryId;
        data.category = value ? { connect: { id: String(value) } } : { disconnect: true };
        break;
      }
      case "projectId": {
        if (!isAbg(actor.role) && actor.role !== "owner" && actor.role !== "admin") throw new AppError("forbidden");
        if (value === t.projectId) return { key: t.key };
        // New key; the old one keeps redirecting.
        const { number, key } = await allocateKey(tx, String(value));
        await tx.taskKeyAlias.create({ data: { key: t.key, taskId: t.id } });
        from = t.key;
        to = key;
        Object.assign(data, { project: { connect: { id: String(value) } }, number, key, category: { disconnect: true } });
        break;
      }
      case "accounts":
      case "orderCodes": {
        if (!can(actor, "edit_task", ctx) && !can(actor, "add_occurrence", ctx)) throw new AppError("forbidden");
        from = t[field];
        data[field] = dedupe(value as string[]);
        break;
      }
    }
    const updated = await tx.task.update({ where: { id: t.id }, data });
    const ev = await recordEvent(tx, {
      actorId: actor.id,
      subjectType: "task",
      subjectId: t.id,
      taskId: t.id,
      verb: field === "decisionText" ? "decision_changed" : field === "description" ? "description_edited" : "field_changed",
      field,
      from: field === "description" ? undefined : (from ?? null),
      to: field === "description" ? undefined : (to ?? null),
    });
    if (field === "assigneeId" && value) {
      await notify(tx, { eventId: ev.id, kind: "task.assigned", actorId: actor.id, recipients: [String(value)], taskId: t.id, email: { subject: `[${updated.key}] Assigned to you`, line: `${updated.key} "${updated.title}" was assigned to you.`, actionLabel: "Open task", path: `/tasks/${updated.key}` } });
    }
    if (field === "priority") await refreshSla(tx, t.id, cfg);
    return { key: updated.key };
  });
}

// ───────────────────────────── comments ─────────────────────────────

export async function addComment(
  actor: Actor,
  taskId: string,
  input: { body: string; isInternal?: boolean; kind?: "comment" | "status_request"; attachments?: AttachmentRef[]; mentions?: string[]; guardOverride?: boolean },
) {
  if (!input.body.trim() && !input.attachments?.length) throw new AppError("invalid_input", "body");
  if (input.isInternal && !can(actor, "comment_internal")) throw new AppError("forbidden");
  const guard = analyzeText(input.body);
  return db.$transaction(async (tx) => {
    const t = await getTaskOrThrow(tx, taskId);
    const c = await tx.comment.create({
      data: { taskId: t.id, authorId: actor.id, body: input.body.trim(), isInternal: !!input.isInternal, kind: input.kind ?? "comment" },
    });
    for (const a of input.attachments ?? []) await createAttachment(tx, actor.id, a, { commentId: c.id });
    await follow(tx, t.id, actor.id, "commenter");
    const ev = await recordEvent(tx, {
      actorId: actor.id,
      subjectType: "comment",
      subjectId: c.id,
      taskId: t.id,
      verb: input.kind === "status_request" ? "status_requested" : "commented",
      isInternal: !!input.isInternal,
    });
    if (guard.level !== "none" && input.guardOverride) {
      await recordEvent(tx, { actorId: actor.id, subjectType: "comment", subjectId: c.id, taskId: t.id, verb: "credential_guard_override", isInternal: true, meta: { level: guard.level } });
    }
    // First response: the first public ABG comment counts (internal notes do not).
    if (!t.firstResponseAt && isAbg(actor.role) && !input.isInternal) {
      await tx.task.update({ where: { id: t.id }, data: { firstResponseAt: new Date() } });
      await refreshSla(tx, t.id);
    }
    const path = `/tasks/${t.key}`;
    const abgOnly = !!input.isInternal;
    if (input.kind === "status_request") {
      await notify(tx, { eventId: ev.id, kind: "task.status_request", actorId: actor.id, recipients: [t.assigneeId, ...(t.assigneeId ? [] : await abgLeads(tx))], taskId: t.id, email: { subject: `[${t.key}] Any update?`, line: `Vendoor asked for an update on ${t.key} "${t.title}".`, actionLabel: "Reply", path } });
    }
    const mentioned = input.mentions ?? [];
    if (mentioned.length) {
      for (const m of mentioned) await follow(tx, t.id, m, "mention");
      await notify(tx, { eventId: ev.id, kind: "task.mentioned", actorId: actor.id, recipients: mentioned, taskId: t.id, abgOnly, email: { subject: `[${t.key}] You were mentioned`, line: `You were mentioned on ${t.key} "${t.title}".`, actionLabel: "Open task", path } });
    }
    const others = (await followers(tx, t.id)).filter((id) => !mentioned.includes(id));
    if (input.kind !== "status_request") await notify(tx, { eventId: ev.id, kind: "task.commented", actorId: actor.id, recipients: others, taskId: t.id, abgOnly });
    await tx.task.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
    return c;
  });
}

export async function editComment(actor: Actor, commentId: string, body: string) {
  return db.$transaction(async (tx) => {
    const c = await tx.comment.findUnique({ where: { id: commentId } });
    if (!c || c.archivedAt) throw new AppError("not_found");
    if (c.authorId !== actor.id) throw new AppError("forbidden");
    if (Date.now() - c.createdAt.getTime() > 15 * 60_000) throw new AppError("conflict", "Comments can be edited for 15 minutes.");
    await tx.comment.update({ where: { id: c.id }, data: { body: body.trim(), editedAt: new Date() } });
    await recordEvent(tx, { actorId: actor.id, subjectType: "comment", subjectId: c.id, taskId: c.taskId, verb: "comment_edited", isInternal: c.isInternal });
  });
}

export async function toggleReaction(actor: Actor, commentId: string, emoji: string) {
  const key = { commentId_memberId_emoji: { commentId, memberId: actor.id, emoji } };
  const existing = await db.reaction.findUnique({ where: key });
  if (existing) await db.reaction.delete({ where: key });
  else await db.reaction.create({ data: { commentId, memberId: actor.id, emoji } });
}

// ───────────────────────────── occurrences, relations, follow ─────────────────────────────

export async function addOccurrence(
  actor: Actor,
  taskId: string,
  input: { accounts?: string[]; orderCodes?: string[]; happenedAt?: string | null; note?: string | null; attachments?: AttachmentRef[] },
) {
  return db.$transaction(async (tx) => {
    const t = await getTaskOrThrow(tx, taskId);
    const occ = await tx.occurrence.create({
      data: {
        taskId: t.id,
        reportedById: actor.id,
        accounts: dedupe(input.accounts),
        orderCodes: dedupe(input.orderCodes),
        happenedAt: input.happenedAt ? new Date(input.happenedAt) : new Date(),
        note: input.note?.trim() || null,
      },
    });
    for (const a of input.attachments ?? []) await createAttachment(tx, actor.id, a, { occurrenceId: occ.id });
    await tx.task.update({
      where: { id: t.id },
      data: {
        occurrenceCount: { increment: 1 },
        accounts: dedupe([...t.accounts, ...(input.accounts ?? [])]),
        orderCodes: dedupe([...t.orderCodes, ...(input.orderCodes ?? [])]),
      },
    });
    await follow(tx, t.id, actor.id, "occurrence");
    const ev = await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: t.id, taskId: t.id, verb: "occurrence_added", meta: { occurrenceId: occ.id } });
    await notify(tx, { eventId: ev.id, kind: "task.commented", actorId: actor.id, recipients: [t.assigneeId, ...(await followers(tx, t.id))], taskId: t.id });
    return occ;
  });
}

export async function addRelation(actor: Actor, fromTaskId: string, toKey: string, kind: "related" | "blocks" | "duplicate_of") {
  return db.$transaction(async (tx) => {
    const from = await getTaskOrThrow(tx, fromTaskId);
    if (!can(actor, "manage_relations", { status: from.status as TaskStatus, requesterId: from.requesterId, assigneeId: from.assigneeId })) throw new AppError("forbidden");
    const to = await findTaskByKey(toKey, tx);
    if (!to || to.id === from.id) throw new AppError("invalid_input", "target");
    await tx.taskRelation.upsert({
      where: { fromTaskId_toTaskId_kind: { fromTaskId: from.id, toTaskId: to.id, kind } },
      create: { fromTaskId: from.id, toTaskId: to.id, kind, createdById: actor.id },
      update: {},
    });
    await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: from.id, taskId: from.id, verb: "relation_added", to: { kind, key: to.key } });
  });
}

export async function removeRelation(actor: Actor, relationId: string) {
  return db.$transaction(async (tx) => {
    const r = await tx.taskRelation.findUnique({ where: { id: relationId }, include: { to: true } });
    if (!r) throw new AppError("not_found");
    await tx.taskRelation.delete({ where: { id: r.id } });
    await recordEvent(tx, { actorId: actor.id, subjectType: "task", subjectId: r.fromTaskId, taskId: r.fromTaskId, verb: "relation_removed", from: { kind: r.kind, key: r.to.key } });
  });
}

export async function setFollow(actor: Actor, taskId: string, following: boolean) {
  await db.follower.upsert({
    where: { taskId_memberId: { taskId, memberId: actor.id } },
    create: { taskId, memberId: actor.id, following, source: "manual" },
    update: { following },
  });
}

// ───────────────────────────── account access (credentials) ─────────────────────────────

async function addCredentialTx(tx: Tx, actor: Actor, taskId: string, c: CredentialInput) {
  if (!c.username?.trim() && !c.password?.trim()) return null;
  const cred = await tx.accessCredential.create({
    data: {
      taskId,
      label: c.label?.trim() || null,
      username: c.username.trim(),
      passwordEncrypted: c.password ? encryptSecret(c.password) : null,
      url: c.url?.trim() || null,
      note: c.note?.trim() || null,
      createdById: actor.id,
    },
  });
  await recordEvent(tx, { actorId: actor.id, subjectType: "credential", subjectId: cred.id, taskId, verb: "credential_added", to: { username: cred.username, label: cred.label } });
  return cred;
}

export async function addCredential(actor: Actor, taskId: string, c: CredentialInput) {
  if (!can(actor, "add_credentials")) throw new AppError("forbidden");
  return db.$transaction((tx) => addCredentialTx(tx, actor, taskId, c));
}

export async function updateCredential(actor: Actor, credentialId: string, c: CredentialInput) {
  return db.$transaction(async (tx) => {
    const cur = await tx.accessCredential.findUnique({ where: { id: credentialId } });
    if (!cur || cur.archivedAt) throw new AppError("not_found");
    await tx.accessCredential.update({
      where: { id: cur.id },
      data: {
        label: c.label?.trim() || null,
        username: c.username.trim(),
        ...(c.password !== undefined && c.password !== null ? { passwordEncrypted: c.password ? encryptSecret(c.password) : null } : {}),
        url: c.url?.trim() || null,
        note: c.note?.trim() || null,
      },
    });
    await recordEvent(tx, { actorId: actor.id, subjectType: "credential", subjectId: cur.id, taskId: cur.taskId, verb: "credential_updated", meta: { passwordChanged: !!c.password } });
  });
}

export async function archiveCredential(actor: Actor, credentialId: string) {
  return db.$transaction(async (tx) => {
    const cur = await tx.accessCredential.findUnique({ where: { id: credentialId } });
    if (!cur) throw new AppError("not_found");
    const allowed = cur.createdById === actor.id || ["owner", "admin", "abg_lead"].includes(actor.role);
    if (!allowed) throw new AppError("forbidden");
    await tx.accessCredential.update({ where: { id: cur.id }, data: { archivedAt: new Date() } });
    await recordEvent(tx, { actorId: actor.id, subjectType: "credential", subjectId: cur.id, taskId: cur.taskId, verb: "credential_removed", from: { username: cur.username } });
  });
}
