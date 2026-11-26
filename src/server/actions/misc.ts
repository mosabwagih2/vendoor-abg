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
import { weekStart } from "@/domain/week";
import { weeklyText } from "@/domain/weekly-text";
import { weeklySummary } from "../weekly-report";
import { createShareToken } from "../report-share";
import { sendWeeklyReportEmails } from "../weekly-send";
import { statusGroup } from "@/domain/status-display";
import type { TaskStatus } from "@/domain/types";

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

const statusLabel = (s: string) => {
  const g = statusGroup(s as TaskStatus);
  return g ? g[0].toUpperCase() + g.slice(1) : "Closed";
};

/** ⌘K palette search: tasks by key or title, projects, people. Titles only, so nothing internal leaks to Vendoor. */
export async function searchPaletteAction(q: string, recent: string[] = []) {
  return runAction(async () => {
    await requireMember();
    const needle = q.trim().slice(0, 80);
    const taskSelect = { key: true, title: true, status: true, project: { select: { name: true } } } as const;
    const [tasks, projects, people, recents] = await Promise.all([
      needle ? db.task.findMany({ where: { archivedAt: null, OR: [{ key: { equals: needle.toUpperCase() } }, { title: { contains: needle } }] }, select: taskSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 6 }) : Promise.resolve([]),
      needle ? db.project.findMany({ where: { archivedAt: null, OR: [{ name: { contains: needle } }, { key: { equals: needle.toUpperCase() } }] }, select: { key: true, name: true, _count: { select: { tasks: true } } }, take: 4 }) : Promise.resolve([]),
      needle ? db.member.findMany({ where: { status: { not: "deactivated" }, name: { contains: needle } }, select: { id: true, name: true, role: true }, take: 4 }) : Promise.resolve([]),
      !needle && recent.length ? db.task.findMany({ where: { key: { in: recent.slice(0, 5) } }, select: taskSelect }) : Promise.resolve([]),
    ]);
    const fromTask = (t: (typeof tasks)[number], kind: "task" | "recent") => ({ id: t.key, kind, title: t.title, subtitle: `${t.key} · ${t.project.name} · ${statusLabel(t.status)}`, href: `/tasks/${t.key}` });
    const order = new Map(recent.map((k, i) => [k, i]));
    return {
      tasks: tasks.map((t) => fromTask(t, "task")),
      recents: recents.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0)).map((t) => fromTask(t, "recent")),
      projects: projects.map((p) => ({ id: p.key, kind: "project" as const, title: p.name, subtitle: `${p._count.tasks} tasks`, href: `/projects/${p.key}` })),
      people: people.map((m) => ({ id: m.id, kind: "person" as const, title: m.name, subtitle: m.role, href: `/tasks?assignee=${m.id}&closed=1` })),
    };
  });
}

const weekKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Plain text of the weekly report, for the share dialog preview and "Copy for WhatsApp". */
export async function weeklyTextAction(week: string) {
  return runAction(async () => {
    await requireMember();
    return weeklyText(await weeklySummary(weekStart(weekKey.parse(week))));
  });
}

/** "Copy a link": a public read-only link to this week's report, valid for 7 days. */
export async function weeklyLinkAction(week: string) {
  return runAction(async () => {
    const me = await requireMember();
    if (me.side !== "abg" && !["owner", "admin"].includes(me.role)) throw new AppError("forbidden");
    return { url: `${process.env.APP_URL ?? "http://localhost:3000"}/shared/weekly/${createShareToken(weekStart(weekKey.parse(week)))}` };
  });
}

/** "Send to ABG by email": the report text to every active ABG lead, with a link to the full report. */
export async function weeklyEmailAction(week: string) {
  return runAction(async () => {
    const me = await requireMember();
    if (me.side !== "abg" && !["owner", "admin"].includes(me.role)) throw new AppError("forbidden");
    return { count: await sendWeeklyReportEmails(weekStart(weekKey.parse(week))) };
  });
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

const incidentSchema = z.object({
  kind: z.enum(["down", "slow", "other"]),
  scope: z.string().max(200),
  details: z.string().max(10_000).optional(),
  startedAt: z.string().nullish(),
  alert: z.boolean().default(true),
  attachments: z.array(z.object({ key: z.string(), fileName: z.string(), mime: z.string(), size: z.number().int().nonnegative(), durationSec: z.number().nullish() })).max(10).optional(),
});

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
