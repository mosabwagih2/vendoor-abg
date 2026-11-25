"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "../session";
import { runAction, AppError } from "../errors";
import { db } from "../db";
import { recordEvent } from "../activity";
import { notify } from "../notify";
import * as rel from "../services/releases";
import * as inc from "../services/incidents";
import { loadDrawer } from "../notifications";
import { can } from "@/domain/policy";

function refresh() {
  revalidatePath("/", "layout");
}

const recordSchema = z.object({
  releasedAt: z.string().nullish(),
  type: z.enum(["planned", "hotfix"]),
  notes: z.string().max(20_000),
  taskIds: z.array(z.string().uuid()).max(500),
  upcomingId: z.string().uuid().nullish(),
});

export async function recordReleaseAction(input: z.input<typeof recordSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const r = await rel.recordRelease(me, recordSchema.parse(input));
    refresh();
    return { number: r.number, count: input.taskIds.length };
  });
}

const upcomingSchema = z.object({ targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().max(20_000), taskIds: z.array(z.string().uuid()).max(500), type: z.enum(["planned", "hotfix"]) });

export async function createUpcomingReleaseAction(input: z.input<typeof upcomingSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const r = await rel.createUpcomingRelease(me, upcomingSchema.parse(input));
    refresh();
    return { id: r.id };
  });
}

const rollbackSchema = z.object({ releaseId: z.string().uuid(), reason: z.string().min(2).max(2000) });

export async function rollbackReleaseAction(input: z.input<typeof rollbackSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const r = await rel.rollbackRelease(me, rollbackSchema.parse(input));
    refresh();
    return r;
  });
}

export async function nextReleaseNumberAction() {
  await requireMember();
  return rel.nextReleaseNumber();
}

export async function markReadAction(ids: string[]) {
  return runAction(async () => {
    const me = await requireMember();
    await db.notification.updateMany({ where: { id: { in: ids }, memberId: me.id, readAt: null }, data: { readAt: new Date() } });
    refresh();
  });
}

/** Loads the bell drawer. Called each time the drawer opens so it is always current. */
export async function loadDrawerAction() {
  return runAction(async () => loadDrawer(await requireMember()));
}

export async function markAllReadAction() {
  return runAction(async () => {
    const me = await requireMember();
    await db.notification.updateMany({ where: { memberId: me.id, channel: "in_app", readAt: null }, data: { readAt: new Date() } });
    refresh();
  });
}

export async function saveViewAction(name: string, query: string, shared: boolean) {
  return runAction(async () => {
    const me = await requireMember();
    const canShare = ["owner", "admin", "abg_lead"].includes(me.role);
    const v = await db.savedView.create({ data: { ownerId: me.id, name: z.string().min(1).max(80).parse(name), query: z.string().max(2000).parse(query), isShared: shared && canShare } });
    refresh();
    return { id: v.id };
  });
}

export async function deleteViewAction(id: string) {
  return runAction(async () => {
    const me = await requireMember();
    const v = await db.savedView.findUnique({ where: { id } });
    if (!v) throw new AppError("not_found");
    if (v.ownerId !== me.id && !["owner", "admin"].includes(me.role)) throw new AppError("forbidden");
    await db.savedView.update({ where: { id }, data: { archivedAt: new Date() } });
    refresh();
  });
}

const incidentSchema = z.object({ scope: z.string().max(200), title: z.string().max(300), details: z.string().max(10_000).optional(), startedAt: z.string().nullish() });

/** "System is down": opens an incident, writes the first timeline entries and alerts everyone at once. */
export async function openIncidentAction(input: z.input<typeof incidentSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const r = await inc.openIncident(me, incidentSchema.parse(input));
    refresh();
    return { number: r.number };
  });
}

const updateSchema = z.object({ incidentId: z.string().uuid(), body: z.string().trim().min(1).max(5000), state: z.enum(["investigating", "identified", "monitoring"]).optional() });

/** ABG posts a status update on the timeline, optionally moving the incident to another state. */
export async function postIncidentUpdateAction(input: z.input<typeof updateSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    await inc.postUpdate(me, updateSchema.parse(input));
    refresh();
  });
}

const closeSchema = z.object({ incidentId: z.string().uuid(), summary: z.string().max(5000), impact: z.string().max(5000), resolution: z.string().max(5000) });

/** ABG closes the incident with Summary, Impact and Resolution (all required). */
export async function resolveIncidentAction(input: z.input<typeof closeSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    await inc.resolveIncident(me, closeSchema.parse(input));
    refresh();
  });
}

/** Re-sends the alert to every ABG member (the "Alert ABG" button). */
export async function alertAbgAction(incidentId: string) {
  return runAction(async () => {
    const me = await requireMember();
    await inc.alertAbg(me, incidentId);
    refresh();
  });
}

export async function setNotificationPrefAction(event: string, channel: "email" | "inApp", on: boolean) {
  return runAction(async () => {
    const me = await requireMember();
    await db.notificationPref.upsert({ where: { memberId_event: { memberId: me.id, event } }, create: { memberId: me.id, event, [channel]: on }, update: { [channel]: on } });
    refresh();
  });
}

void can;
