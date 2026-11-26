import "server-only";
import { db } from "../db";
import { recordEvent } from "../activity";
import { notify } from "../notify";
import { AppError } from "../errors";
import type { CurrentMember } from "../session";
import { alertWaitMinutes, canAlertAgain, closingProblems, incidentTitle, type IncidentKind, type IncidentState } from "@/domain/incident";
import { createAttachment, type AttachmentRef } from "./tasks";

/** Only ABG works an incident. Vendoor reports it and reads the timeline. */
function requireAbg(me: CurrentMember) {
  if (me.side !== "abg") throw new AppError("forbidden");
}

async function abgIds(tx: Pick<typeof db, "member">) {
  const rows = await tx.member.findMany({ where: { status: { not: "deactivated" }, team: { side: "delivery" } }, select: { id: true } });
  return rows.map((m) => m.id);
}

export async function openIncident(me: CurrentMember, data: { kind: IncidentKind; scope: string; details?: string; startedAt?: string | null; alert: boolean; attachments?: AttachmentRef[] }) {
  return db.$transaction(async (tx) => {
    const last = await tx.incident.findFirst({ orderBy: { number: "desc" } });
    const incident = await tx.incident.create({
      data: {
        number: (last?.number ?? 0) + 1,
        title: incidentTitle(data.kind),
        scope: data.scope,
        state: "investigating",
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        openedById: me.id,
        impact: data.details || null,
        timeline: {
          create: [
            { authorId: me.id, kind: "reported", state: "investigating", body: [data.scope, data.details].filter(Boolean).join(". ") },
            ...(data.alert ? [{ authorId: me.id, kind: "alert_sent", body: "ABG alerted" }] : []),
          ],
        },
      },
    });
    for (const a of data.attachments ?? []) await createAttachment(tx, me.id, a, { incidentId: incident.id });
    const ev = await recordEvent(tx, { actorId: me.id, subjectType: "incident", subjectId: incident.id, verb: "incident_opened", meta: { number: incident.number } });
    if (!data.alert) return incident;
    const everyone = await tx.member.findMany({ where: { status: { not: "deactivated" } }, select: { id: true } });
    await notify(tx, {
      eventId: ev.id,
      kind: "task.new_request",
      actorId: me.id,
      recipients: everyone.map((m) => m.id),
      email: { subject: `[INC-${incident.number}] ${incident.title}`, line: `${me.name} reported: ${data.scope}. ${data.details ?? ""}`, actionLabel: "Open tracker", path: `/trouble/${incident.number}` },
    });
    return incident;
  });
}

async function openOne(id: string) {
  const i = await db.incident.findUnique({ where: { id } });
  if (!i) throw new AppError("not_found");
  if (i.state === "resolved") throw new AppError("invalid_input", "This incident is already closed.");
  return i;
}

export async function postUpdate(me: CurrentMember, d: { incidentId: string; body: string; state?: IncidentState }) {
  requireAbg(me);
  const i = await openOne(d.incidentId);
  const state = d.state && d.state !== "resolved" ? d.state : undefined;
  await db.$transaction(async (tx) => {
    await tx.incidentTimelineEntry.create({ data: { incidentId: i.id, authorId: me.id, body: d.body, kind: state && state !== i.state ? "status" : "update", state: state ?? i.state } });
    if (state && state !== i.state) await tx.incident.update({ where: { id: i.id }, data: { state } });
    await recordEvent(tx, { actorId: me.id, subjectType: "incident", subjectId: i.id, verb: "incident_updated" });
  });
}

export async function resolveIncident(me: CurrentMember, d: { incidentId: string; summary: string; impact: string; resolution: string }) {
  requireAbg(me);
  const i = await openOne(d.incidentId);
  if (closingProblems(d).length) throw new AppError("invalid_input", "Summary, impact and resolution are all required.");
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.incident.update({ where: { id: i.id }, data: { state: "resolved", resolvedAt: now, closedAt: now, summary: d.summary.trim(), impact: d.impact.trim(), resolution: d.resolution.trim() } });
    await tx.incidentTimelineEntry.create({ data: { incidentId: i.id, authorId: me.id, kind: "resolved", state: "resolved", body: d.summary.trim() } });
    const ev = await recordEvent(tx, { actorId: me.id, subjectType: "incident", subjectId: i.id, verb: "incident_resolved" });
    const everyone = await tx.member.findMany({ where: { status: { not: "deactivated" } }, select: { id: true } });
    await notify(tx, { eventId: ev.id, kind: "task.new_request", actorId: me.id, recipients: everyone.map((m) => m.id) });
  });
}

export async function alertAbg(me: CurrentMember, incidentId: string) {
  const i = await openOne(incidentId);
  // Anyone can press the button, so limit how often it can email ABG.
  const last = await db.incidentTimelineEntry.findFirst({ where: { incidentId: i.id, kind: "alert_sent" }, orderBy: { at: "desc" }, select: { at: true } });
  const now = new Date();
  if (!canAlertAgain(last?.at ?? null, now)) throw new AppError("invalid_input", `Already alerted. You can alert again in ${alertWaitMinutes(last!.at, now)} min.`);
  await db.$transaction(async (tx) => {
    await tx.incidentTimelineEntry.create({ data: { incidentId: i.id, authorId: me.id, kind: "alert_sent", body: "ABG alerted again" } });
    const ev = await recordEvent(tx, { actorId: me.id, subjectType: "incident", subjectId: i.id, verb: "incident_alerted" });
    await notify(tx, {
      eventId: ev.id,
      kind: "task.new_request",
      actorId: me.id,
      recipients: await abgIds(tx),
      email: { subject: `[INC-${i.number}] ${i.title} still open`, line: `${me.name} is asking ABG to look at this now.`, actionLabel: "Open incident", path: `/trouble/${i.number}` },
    });
  });
}
