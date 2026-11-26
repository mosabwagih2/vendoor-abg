import "server-only";
import { decryptSecret } from "./crypto";
import { db } from "./db";
import { decorate, taskRowSelect } from "./queries";
import { getWorkspaceConfig } from "./calendar";
import { computeClock, pausesFromSpans } from "@/domain/sla";
import { SLA_PAUSE_STATUSES, waitingOn } from "@/domain/workflow";
import { statusGroup } from "@/domain/status-display";
import { findTaskByKey } from "./services/tasks";
import { activityFeed } from "./activity-feed";
import type { CurrentMember } from "./session";
import type { Priority, TaskStatus } from "@/domain/types";

function att(a: { id: string; fileName: string; mime: string; size: bigint; durationSec: number | null; waveform: unknown; processingState: string; posterKey: string | null; createdAt: Date; uploadedBy?: { name: string } | null }) {
  return {
    id: a.id,
    fileName: a.fileName,
    mime: a.mime,
    size: Number(a.size),
    durationSec: a.durationSec,
    waveform: (a.waveform as number[] | null) ?? null,
    processingState: a.processingState as "pending" | "ready" | "failed",
    hasPoster: !!a.posterKey,
    createdAt: a.createdAt.toISOString(),
    uploadedBy: a.uploadedBy?.name ?? null,
  };
}
export type AttachmentView = ReturnType<typeof att>;

export async function loadTaskDetail(key: string, viewer: CurrentMember) {
  const base = await findTaskByKey(key);
  if (!base || base.archivedAt) return null;
  const isVendoor = viewer.side === "vendoor";
  const t = await db.task.findUniqueOrThrow({
    where: { id: base.id },
    include: {
      project: { select: { id: true, key: true, name: true } },
      category: { select: { id: true, name: true } },
      customStatus: { select: { id: true, name: true, color: true, stepGroup: true } },
      requester: { select: { id: true, name: true, handle: true } },
      createdBy: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, handle: true } },
      verifiedBy: { select: { id: true, name: true } },
      parent: { select: { id: true, key: true, title: true, status: true } },
      currentRelease: { select: { id: true, number: true, state: true, releasedAt: true, rollbackReason: true, deployedBy: { select: { name: true } } } },
      attachments: { where: { archivedAt: null }, include: { uploadedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      occurrences: {
        where: { archivedAt: null },
        orderBy: { happenedAt: "desc" },
        include: { reportedBy: { select: { name: true } }, attachments: { where: { archivedAt: null }, include: { uploadedBy: { select: { name: true } } } } },
      },
      comments: {
        where: { archivedAt: null, ...(isVendoor ? { isInternal: false } : {}) },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, role: true } },
          reactions: { include: { member: { select: { id: true, name: true } } } },
          attachments: { where: { archivedAt: null }, include: { uploadedBy: { select: { name: true } } } },
        },
      },
      relationsFrom: { include: { to: { select: { id: true, key: true, title: true, status: true } } } },
      relationsTo: { include: { from: { select: { id: true, key: true, title: true, status: true } } } },
      followers: { where: { following: true }, include: { member: { select: { id: true, name: true } } } },
      credentials: { where: { archivedAt: null }, include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      statusSpans: { orderBy: { enteredAt: "asc" } },
    },
  });
  const task = t as unknown as typeof t & Record<string, never> & {
    project: { id: string; key: string; name: string };
    category: { id: string; name: string } | null;
    requester: { id: string; name: string; handle: string };
    createdBy: { id: string; name: string };
    assignee: { id: string; name: string; handle: string } | null;
    verifiedBy: { id: string; name: string } | null;
    parent: { id: string; key: string; title: string; status: string } | null;
    currentRelease: { id: string; number: string; state: "upcoming" | "released" | "rolled_back"; releasedAt: Date | null; rollbackReason: string | null; deployedBy: { name: string } | null } | null;
  };
  const subtasks = await decorate(await db.task.findMany({ where: { parentId: base.id, archivedAt: null }, select: taskRowSelect, orderBy: { number: "asc" } }));
  const history = await activityFeed(viewer, { taskId: base.id }, 200);
  const cfg = await getWorkspaceConfig();
  const prio = (base.priority ?? base.suggestedPriority ?? "medium") as Priority;
  const spans = (t as unknown as { statusSpans: Array<{ status: string; enteredAt: Date; leftAt: Date | null }> }).statusSpans;
  const now = new Date();
  const firstResponse = computeClock({ calendar: cfg.calendar, targetMinutes: cfg.targets[prio]?.firstResponse ?? null, clockStart: base.slaClockStartedAt, pauses: pausesFromSpans(spans, ["needs_info"]), completedAt: base.firstResponseAt, now });
  const resolution = computeClock({
    calendar: cfg.calendar,
    targetMinutes: base.priority ? (cfg.targets[prio]?.resolution ?? null) : null,
    clockStart: base.slaClockStartedAt,
    pauses: pausesFromSpans(spans, SLA_PAUSE_STATUSES),
    completedAt: base.status === "done" ? base.shippedAt : null,
    now,
  });
  const cancelProposer = base.cancelProposedById ? await db.member.findUnique({ where: { id: base.cancelProposedById }, select: { name: true } }) : null;
  const decisionBy = base.decisionUpdatedById ? await db.member.findUnique({ where: { id: base.decisionUpdatedById }, select: { name: true } }) : null;
  const versions = await db.descriptionVersion.count({ where: { taskId: base.id } });

  type Raw = {
    attachments: Parameters<typeof att>[0][];
    occurrences: Array<{ id: string; accounts: string[]; orderCodes: string[]; happenedAt: Date; note: string | null; mergedFromTaskId: string | null; reportedBy: { name: string }; attachments: Parameters<typeof att>[0][] }>;
    comments: Array<{ id: string; kind: string; body: string; isInternal: boolean; editedAt: Date | null; createdAt: Date; author: { id: string; name: string; role: string }; reactions: Array<{ emoji: string; member: { id: string; name: string } }>; attachments: Parameters<typeof att>[0][] }>;
    relationsFrom: Array<{ id: string; kind: string; to: { id: string; key: string; title: string; status: string } }>;
    relationsTo: Array<{ id: string; kind: string; from: { id: string; key: string; title: string; status: string } }>;
    followers: Array<{ member: { id: string; name: string } }>;
    credentials: Array<{ id: string; label: string | null; username: string; passwordEncrypted: string | null; url: string | null; note: string | null; createdById: string; createdAt: Date; createdBy: { name: string } }>;
  };
  const r = t as unknown as Raw;
  const stepGroup = statusGroup(base.status as TaskStatus);
  const customOptions = stepGroup ? await db.customStatus.findMany({ where: { stepGroup }, orderBy: { position: "asc" }, select: { id: true, name: true, color: true } }) : [];

  return {
    id: base.id,
    key: base.key,
    title: base.title,
    description: base.description,
    type: base.type,
    status: base.status as TaskStatus,
    customStatus: (t as unknown as { customStatus: { id: string; name: string; color: string; stepGroup: string } | null }).customStatus,
    customOptions,
    waitingOn: waitingOn(base.status as TaskStatus),
    priority: base.priority as Priority | null,
    suggestedPriority: base.suggestedPriority as Priority | null,
    currentBehaviour: base.currentBehaviour,
    expectedBehaviour: base.expectedBehaviour,
    whyItMatters: base.whyItMatters,
    howOften: base.howOften,
    accounts: base.accounts,
    orderCodes: base.orderCodes,
    decisionText: base.decisionText,
    decisionUpdatedAt: base.decisionUpdatedAt?.toISOString() ?? null,
    decisionBy: decisionBy?.name ?? null,
    dueAt: base.dueAt?.toISOString() ?? null,
    isOverdue: !!base.dueAt && base.dueAt < now && ["triage", "needs_info", "planned", "in_progress", "reopened"].includes(base.status),
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),
    shippedAt: base.shippedAt?.toISOString() ?? null,
    verifiedAt: base.verifiedAt?.toISOString() ?? null,
    reopenCount: base.reopenCount,
    closeReason: base.closeReason,
    closeNote: base.closeNote,
    cancelProposed: base.cancelProposedReason ? { by: cancelProposer?.name ?? "", reason: base.cancelProposedReason } : null,
    descriptionVersions: versions,
    project: task.project,
    category: task.category,
    requester: task.requester,
    requesterId: base.requesterId,
    createdBy: task.createdBy,
    assignee: task.assignee,
    assigneeId: base.assigneeId,
    verifiedBy: task.verifiedBy,
    parent: task.parent,
    release: task.currentRelease ? { id: task.currentRelease.id, number: task.currentRelease.number, state: task.currentRelease.state, releasedAt: task.currentRelease.releasedAt?.toISOString() ?? null, deployedBy: task.currentRelease.deployedBy?.name ?? null, rollbackReason: task.currentRelease.rollbackReason } : null,
    sla: {
      firstResponse: { ...firstResponse, dueAt: firstResponse.dueAt?.toISOString() ?? null },
      resolution: { ...resolution, dueAt: resolution.dueAt?.toISOString() ?? null },
    },
    attachments: r.attachments.map(att),
    occurrences: r.occurrences.map((o) => ({ id: o.id, accounts: o.accounts, orderCodes: o.orderCodes, happenedAt: o.happenedAt.toISOString(), note: o.note, merged: !!o.mergedFromTaskId, reportedBy: o.reportedBy.name, attachments: o.attachments.map(att) })),
    comments: r.comments.map((c) => ({
      id: c.id,
      kind: c.kind,
      body: c.body,
      isInternal: c.isInternal,
      editedAt: c.editedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
      reactions: c.reactions.map((x) => ({ emoji: x.emoji, memberId: x.member.id, name: x.member.name })),
      attachments: c.attachments.map(att),
    })),
    relations: [
      ...r.relationsFrom.map((x) => ({ id: x.id, kind: x.kind, direction: "from" as const, task: x.to })),
      ...r.relationsTo.map((x) => ({ id: x.id, kind: x.kind, direction: "to" as const, task: x.from })),
    ],
    followers: r.followers.map((f) => f.member),
    credentials: r.credentials.map((c) => ({ id: c.id, label: c.label, username: c.username, hasPassword: !!c.passwordEncrypted, password: readPassword(c.passwordEncrypted), url: c.url, note: c.note, createdById: c.createdById, createdBy: c.createdBy.name, createdAt: c.createdAt.toISOString() })),
    subtasks,
    history,
  };
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof loadTaskDetail>>>;

/** Accounts are shared between Vendoor and ABG, so the password is shown as typed. It stays encrypted at rest; a bad value shows as empty instead of breaking the page. */
function readPassword(enc: string | null): string | null {
  if (!enc) return null;
  try {
    return decryptSecret(enc);
  } catch {
    return null;
  }
}
