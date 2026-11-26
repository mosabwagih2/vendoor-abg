import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hash } from "@node-rs/argon2";
import { PrismaClient, type Priority } from "../../src/generated/prisma/client";
import { addWorkingMinutes, DEFAULT_CALENDAR, type WorkCalendar } from "../../src/domain/sla";
import { BACKLOG, HOLIDAYS, PEOPLE, PROJECTS, SLA } from "./data";

/**
 * Seeds the workspace, the two teams, the people (PRD 3.1), the 11 projects (4.4), SLA defaults (4.3), Egypt holidays,
 * and the migration backlog (11.1). Run with `pnpm db:seed`. `--reset` wipes the database first.
 */
const db = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

export const DEV_PASSWORD = process.env.SEED_PASSWORD ?? "Vendoor!2026";

async function wipe() {
  const tables = await db.$queryRaw<Array<{ name: string }>>`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`;
  // One connection for all statements, so the foreign key switch applies to every TRUNCATE.
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of tables) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t.name}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
}

function cairoNoon(date: string): Date {
  // 12:00 Cairo (UTC+2 in winter; backlog dates are Sep–Nov, DST ends 29 Oct). Good enough for history timestamps.
  return new Date(`${date}T10:00:00Z`);
}

async function main() {
  if (process.argv.includes("--reset")) await wipe();
  if (await db.workspace.findFirst()) {
    console.log("Already seeded. Use `pnpm db:reset` to start over.");
    return;
  }
  const now = new Date();
  const ws = await db.workspace.create({ data: { name: "Vendoor × ABG" } });
  for (const s of SLA) await db.slaTarget.create({ data: { workspaceId: ws.id, priority: s.priority, firstResponseMinutes: s.firstResponseMinutes, resolutionMinutes: s.resolutionMinutes } });
  for (const h of HOLIDAYS) await db.holiday.create({ data: { workspaceId: ws.id, date: new Date(`${h.date}T00:00:00Z`), name: h.name, certainty: h.certainty } });

  const vendoor = await db.team.create({ data: { workspaceId: ws.id, name: "Vendoor", side: "requester" } });
  const abg = await db.team.create({ data: { workspaceId: ws.id, name: "ABG Dev Team", side: "delivery" } });

  const pw = await hash(DEV_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const m: Record<string, string> = {};
  for (const p of PEOPLE) {
    const member = await db.member.create({
      data: { name: p.name, handle: p.handle, email: p.email, emailVerified: true, role: p.role, teamId: p.side === "requester" ? vendoor.id : abg.id, status: "active" },
    });
    await db.account.create({ data: { accountId: member.id, providerId: "credential", userId: member.id, password: pw } });
    m[p.handle] = member.id;
  }

  const proj: Record<string, { id: string; categories: Record<string, string> }> = {};
  for (const [i, p] of PROJECTS.entries()) {
    const project = await db.project.create({
      data: { workspaceId: ws.id, key: p.key, name: p.name, description: p.description, position: i, vendoorLeadId: m["yara"], abgLeadId: m["za8loul"] },
    });
    const cats: Record<string, string> = {};
    for (const [j, c] of p.categories.entries()) cats[c] = (await db.projectCategory.create({ data: { projectId: project.id, name: c, position: j } })).id;
    proj[p.key] = { id: project.id, categories: cats };
  }

  const cal: WorkCalendar = { ...DEFAULT_CALENDAR, holidays: HOLIDAYS.map((h) => h.date) };
  const targets = Object.fromEntries(SLA.map((s) => [s.priority, s]));

  // One release from the chat history for the shipped SUP task.
  const release = await db.release.create({
    data: { number: "R-2026-11-22", state: "released", type: "hotfix", releasedAt: cairoNoon("2026-11-22"), notes: "Product activation separated from supplier activation.", createdById: m["za8loul"] },
  });

  const created: Record<string, string> = {};
  for (const item of BACKLOG) {
    const p = await db.project.update({ where: { id: proj[item.project].id }, data: { nextTaskNumber: { increment: 1 } } });
    const number = p.nextTaskNumber - 1;
    const key = `${p.key}-${number}`;
    const reported = cairoNoon(item.firstReported);
    const prio = (item.priority ?? "medium") as Priority;
    const accepted = item.start !== "triage";
    const assignee = item.project === "INF" ? m["ahmed-kamal"] : m["ahmed-shiha"];
    // SLA clock starts at launch (seed time), not at the first-reported date, so day one is not all breached.
    const firstDue = addWorkingMinutes(cal, now, targets[prio].firstResponseMinutes);
    const resDue = targets[prio].resolutionMinutes ? addWorkingMinutes(cal, now, targets[prio].resolutionMinutes!) : null;

    const task = await db.task.create({
      data: {
        projectId: p.id,
        number,
        key,
        title: item.title,
        description: `Migrated from the WhatsApp group. First reported ${item.firstReported}, last mentioned ${item.lastMentioned}.`,
        type: item.type,
        status: item.start,
        statusChangedAt: now,
        suggestedPriority: prio,
        priority: accepted ? prio : null,
        requesterId: m["yara"],
        createdById: m["yara"],
        assigneeId: accepted ? assignee : null,
        accounts: item.accounts ?? [],
        orderCodes: item.orderCodes ?? [],
        createdAt: reported,
        slaClockStartedAt: now,
        slaFirstResponseDueAt: accepted ? null : firstDue,
        slaResolutionDueAt: accepted && item.start !== "needs_info" && item.start !== "shipped" ? resDue : null,
        firstResponseAt: accepted ? now : null,
        dueAt: accepted && item.start === "reopened" ? resDue : null,
        shippedAt: item.start === "shipped" ? cairoNoon(item.lastMentioned) : null,
        reopenCount: item.start === "reopened" ? 1 : 0,
        previousStatus: item.start === "needs_info" ? "triage" : null,
        currentReleaseId: item.project === "SUP" && item.start === "shipped" ? release.id : null,
        occurrenceCount: item.occurrences?.length ?? 0,
        categoryId: item.project === "BOS" && item.title.includes("linking") ? proj.BOS.categories["Account linking"] : item.project === "BOS" && item.title.includes("Status notes") ? proj.BOS.categories["Status notes"] : null,
      },
    });
    created[`${item.project}:${item.title}`] = task.id;
    await db.taskStatusSpan.create({ data: { taskId: task.id, status: item.start, enteredAt: now, actorId: m["yara"] } });
    await db.follower.create({ data: { taskId: task.id, memberId: m["yara"], source: "requester" } });
    if (accepted) await db.follower.create({ data: { taskId: task.id, memberId: assignee, source: "assignee" } });
    await db.activityEvent.create({ data: { actorId: m["yara"], subjectType: "task", subjectId: task.id, taskId: task.id, verb: "created", toValue: { status: item.start, key, migrated: true }, at: reported } });
    for (const o of item.occurrences ?? []) {
      await db.occurrence.create({ data: { taskId: task.id, reportedById: m["yara"], accounts: o.accounts ?? [], orderCodes: o.orderCodes ?? [], happenedAt: cairoNoon(o.date), note: o.note } });
    }
    if (item.start === "needs_info" && item.needsInfoQuestion) {
      await db.comment.create({ data: { taskId: task.id, authorId: m["za8loul"], kind: "ask_info", body: item.needsInfoQuestion } });
    }
    if (item.start === "reopened") {
      await db.comment.create({ data: { taskId: task.id, authorId: m["yara"], kind: "reopen_note", body: "Reported as fixed in the group, but status notes still continue after Delivered/Returned (22 Nov)." } });
    }
    if (item.start === "shipped") {
      await db.comment.create({ data: { taskId: task.id, authorId: assignee, body: "Reported as done in the WhatsApp group. Please test in production and confirm." } });
      if (task.currentReleaseId) await db.releaseTask.create({ data: { releaseId: release.id, taskId: task.id, addedAt: cairoNoon("2026-11-22") } });
    }
  }

  // Multi-project row (EZO, SHP): one EZO task, related to the SHP export task.
  const ezo = created["EZO:Real-time stock sync to EasyOrders and Shopify after export"];
  const shp = created["SHP:Easy export of all products to EasyOrders and Shopify"];
  if (ezo && shp) await db.taskRelation.create({ data: { fromTaskId: ezo, toTaskId: shp, kind: "related", createdById: m["yara"] } });

  // PRD 11.1 last row: outages on 21 and 22 Nov, closed without a root cause.
  await db.incident.create({
    data: { number: 1, title: "System down on 21 and 22 Nov", scope: "Whole system", state: "resolved", startedAt: cairoNoon("2026-11-21"), resolvedAt: cairoNoon("2026-11-22"), openedById: m["yara"], closedAt: cairoNoon("2026-11-22"), impact: "Orders could not be entered.", rootCause: null },
  });

  console.log(`Seeded ${PEOPLE.length} people, ${PROJECTS.length} projects, ${BACKLOG.length} tasks.`);
  console.log(`Sign in with any seeded email and the password: ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
