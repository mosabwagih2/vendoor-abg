"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { requireMember } from "../session";
import { runAction, AppError } from "../errors";
import { db } from "../db";
import { numberList } from "../json-list";
import { recordEvent } from "../activity";
import { invalidateWorkspaceConfig } from "../calendar";
import { can } from "@/domain/policy";
import { ROLES, PRIORITIES } from "@/domain/types";
import { auth } from "../auth";

function refresh() {
  revalidatePath("/", "layout");
}

const memberSchema = z.object({ name: z.string().min(1).max(120), email: z.string().email().max(200), role: z.enum(ROLES) });

export async function addMemberAction(input: z.input<typeof memberSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    const data = memberSchema.parse(input);
    const abgRole = data.role === "abg_lead" || data.role === "abg_member";
    if (!can(me, "manage_members") && !(can(me, "manage_abg_members") && data.role === "abg_member")) throw new AppError("forbidden");
    const team = await db.team.findFirstOrThrow({ where: { side: abgRole ? "delivery" : "requester" } });
    const handleBase = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
    let handle = handleBase;
    for (let i = 2; await db.member.findUnique({ where: { handle } }); i++) handle = `${handleBase}-${i}`;
    const m = await db.member.create({ data: { name: data.name, email: data.email.toLowerCase(), role: data.role, teamId: team.id, handle, status: "active", emailVerified: true } });
    // A random password nobody knows; the member signs in with a magic link and can then set a password.
    await db.account.create({ data: { accountId: m.id, providerId: "credential", userId: m.id, password: await hash(crypto.randomUUID() + crypto.randomUUID()) } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "member", subjectId: m.id, verb: "member_added", to: { role: data.role } }));
    await auth.api.signInMagicLink({ body: { email: m.email, callbackURL: "/home" }, headers: new Headers() }).catch(() => undefined);
    refresh();
  });
}

export async function setMemberStatusAction(memberId: string, status: "active" | "deactivated") {
  return runAction(async () => {
    const me = await requireMember();
    const target = await db.member.findUniqueOrThrow({ where: { id: memberId } });
    const allowed = can(me, "manage_members") || (can(me, "manage_abg_members") && target.role === "abg_member");
    if (!allowed || target.id === me.id) throw new AppError("forbidden");
    await db.member.update({ where: { id: memberId }, data: { status } });
    if (status === "deactivated") await db.session.deleteMany({ where: { userId: memberId } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "member", subjectId: memberId, verb: "member_status_changed", from: target.status, to: status }));
    refresh();
  });
}

export async function changeRoleAction(memberId: string, role: string) {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_members")) throw new AppError("forbidden");
    // Nobody changes their own role: it is how the last admin would lock everyone out.
    if (memberId === me.id) throw new AppError("forbidden");
    const r = z.enum(ROLES).parse(role);
    const target = await db.member.findUniqueOrThrow({ where: { id: memberId } });
    const team = await db.team.findFirstOrThrow({ where: { side: r === "abg_lead" || r === "abg_member" ? "delivery" : "requester" } });
    await db.member.update({ where: { id: memberId }, data: { role: r, teamId: team.id } });
    // New privileges need a new session (OWASP session management).
    await db.session.deleteMany({ where: { userId: memberId } });
    await db.$transaction((tx) => recordEvent(tx, { actorId: me.id, subjectType: "member", subjectId: memberId, verb: "role_changed", from: target.role, to: r }));
    refresh();
  });
}

const projectSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().regex(/^[A-Z]{2,5}$/),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  health: z.enum(["on_track", "at_risk", "off_track"]).optional(),
  vendoorLeadId: z.string().uuid().nullish(),
  abgLeadId: z.string().uuid().nullish(),
  categories: z.array(z.string().max(80)).max(30),
});

export async function saveProjectAction(input: z.input<typeof projectSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_projects")) throw new AppError("forbidden");
    const d = projectSchema.parse(input);
    const ws = await db.workspace.findFirstOrThrow();
    await db.$transaction(async (tx) => {
      const p = d.id
        ? await tx.project.update({ where: { id: d.id }, data: { name: d.name, description: d.description, health: d.health, vendoorLeadId: d.vendoorLeadId ?? null, abgLeadId: d.abgLeadId ?? null } })
        : await tx.project.create({ data: { workspaceId: ws.id, key: d.key, name: d.name, description: d.description, vendoorLeadId: d.vendoorLeadId ?? null, abgLeadId: d.abgLeadId ?? null, position: await tx.project.count() } });
      const existing = await tx.projectCategory.findMany({ where: { projectId: p.id, archivedAt: null } });
      const wanted = d.categories.map((c) => c.trim()).filter(Boolean);
      for (const c of existing) if (!wanted.includes(c.name)) await tx.projectCategory.update({ where: { id: c.id }, data: { archivedAt: new Date() } });
      for (const [i, name] of wanted.entries()) {
        const found = existing.find((c) => c.name === name);
        if (found) await tx.projectCategory.update({ where: { id: found.id }, data: { position: i } });
        else await tx.projectCategory.create({ data: { projectId: p.id, name, position: i } });
      }
      await recordEvent(tx, { actorId: me.id, subjectType: "project", subjectId: p.id, verb: d.id ? "project_updated" : "project_created" });
    });
    refresh();
  });
}

const slaSchema = z.object({
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  workDayStartMin: z.number().int().min(0).max(1439).optional(),
  workDayEndMin: z.number().int().min(1).max(1440).optional(),
  targets: z.array(z.object({ priority: z.enum(PRIORITIES), firstResponseMinutes: z.number().int().min(1), resolutionMinutes: z.number().int().min(1).nullable() })).optional(),
});

export async function saveSlaAction(input: z.input<typeof slaSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_sla")) throw new AppError("forbidden");
    const d = slaSchema.parse(input);
    const ws = await db.workspace.findFirstOrThrow();
    const start = d.workDayStartMin ?? ws.workDayStartMin;
    const end = d.workDayEndMin ?? ws.workDayEndMin;
    if (end <= start) throw new AppError("invalid_input", "hours");
    await db.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: ws.id }, data: { workingDays: d.workingDays ?? numberList(ws.workingDays), workDayStartMin: start, workDayEndMin: end } });
      for (const t of d.targets ?? []) await tx.slaTarget.update({ where: { workspaceId_priority: { workspaceId: ws.id, priority: t.priority } }, data: { firstResponseMinutes: t.firstResponseMinutes, resolutionMinutes: t.resolutionMinutes } });
      await recordEvent(tx, { actorId: me.id, subjectType: "settings", subjectId: ws.id, verb: "sla_updated", to: d });
    });
    invalidateWorkspaceConfig();
    refresh();
  });
}

export async function addHolidayAction(date: string, name: string, certainty: "confirmed" | "estimated") {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_sla")) throw new AppError("forbidden");
    const ws = await db.workspace.findFirstOrThrow();
    await db.holiday.upsert({
      where: { workspaceId_date: { workspaceId: ws.id, date: new Date(`${z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date)}T00:00:00Z`) } },
      create: { workspaceId: ws.id, date: new Date(`${date}T00:00:00Z`), name: z.string().min(1).max(120).parse(name), certainty },
      update: { name, certainty },
    });
    invalidateWorkspaceConfig();
    refresh();
  });
}

export async function removeHolidayAction(id: string) {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_sla")) throw new AppError("forbidden");
    await db.holiday.delete({ where: { id } });
    invalidateWorkspaceConfig();
    refresh();
  });
}

const generalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  verifyReminderWorkingDays: z.number().int().min(1).max(30),
  unverifiedWorkingDays: z.number().int().min(1).max(60),
  weeklyReportAuto: z.boolean(),
});

/** General settings: workspace name and the verify window. Only people who manage the service clock can change them. */
export async function saveGeneralAction(input: z.input<typeof generalSchema>) {
  return runAction(async () => {
    const me = await requireMember();
    if (!can(me, "manage_sla")) throw new AppError("forbidden");
    const d = generalSchema.parse(input);
    const ws = await db.workspace.findFirstOrThrow();
    await db.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: ws.id }, data: d });
      await recordEvent(tx, { actorId: me.id, subjectType: "settings", subjectId: ws.id, verb: "general_updated", to: d });
    });
    invalidateWorkspaceConfig();
    refresh();
  });
}
