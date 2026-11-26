import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import * as svc from "@/server/services/tasks";
import { possibleDuplicates } from "@/server/queries";
import { openIncident } from "@/server/services/incidents";
import type { CurrentMember } from "@/server/session";
import { getWorkspaceConfig, invalidateWorkspaceConfig } from "@/server/calendar";
import { stringList } from "@/server/json-list";
import type { Actor } from "@/domain/policy";

/**
 * MySQL-specific behaviour, against the seeded database: what PostgreSQL did for free and MySQL needs care for
 * (long text, emoji, JSON lists, case rules, NULL order, time zones, concurrent writes, the attachment check).
 */
let yara: Actor;
let lead: Actor;
let projectId: string;
const mark = `dbtest-${Date.now()}`;

const ask = (title: string, extra: Partial<svc.CreateRequestInput> = {}) => svc.createRequest(yara, { type: "question", projectId, title, ...extra });

beforeAll(async () => {
  const y = await db.member.findUniqueOrThrow({ where: { email: "yara@vendoor.test" } });
  const z = await db.member.findUniqueOrThrow({ where: { email: "za8loul@abg.test" } });
  yara = { id: y.id, role: y.role };
  lead = { id: z.id, role: z.role };
  projectId = (await db.project.findUniqueOrThrow({ where: { key: "BOS" } })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("text", () => {
  it("keeps 50,000 Arabic characters in a description (more than TEXT's 64 KB)", async () => {
    const description = "ب".repeat(50_000);
    const t = await ask(`${mark} long`, { description });
    const back = await db.task.findUniqueOrThrow({ where: { id: t.id }, select: { description: true } });
    expect(back.description).toBe(description);
  });

  it("keeps emoji and Arabic exactly (utf8mb4)", async () => {
    const title = `${mark} 🚚 الشحنة اتأخرت 👍🏽`;
    const t = await ask(title);
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).title).toBe(title);
  });

  it("a long comment with emoji is saved", async () => {
    const t = await ask(`${mark} comment`);
    const body = "😀".repeat(20_000);
    const c = await svc.addComment(lead, t.id, { body });
    expect((await db.comment.findUniqueOrThrow({ where: { id: c.id } })).body).toBe(body);
  });

  it("an empty description defaults to ''", async () => {
    const t = await ask(`${mark} empty`);
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).description).toBe("");
  });
});

describe("reactions", () => {
  it("different emoji on one comment are different reactions", async () => {
    const t = await ask(`${mark} reactions`);
    const c = await svc.addComment(lead, t.id, { body: "hello" });
    await svc.toggleReaction(yara, c.id, "👍");
    await svc.toggleReaction(yara, c.id, "🎉");
    await svc.toggleReaction(yara, c.id, "❤️");
    expect((await db.reaction.findMany({ where: { commentId: c.id } })).map((r) => r.emoji).sort()).toEqual(["❤️", "👍", "🎉"].sort());
    await svc.toggleReaction(yara, c.id, "👍");
    expect((await db.reaction.findMany({ where: { commentId: c.id } })).map((r) => r.emoji).sort()).toEqual(["❤️", "🎉"].sort());
  });
});

describe("lists stored as JSON", () => {
  it("dedupes and merges accounts and order codes, and finds them exactly", async () => {
    const t = await ask(`${mark} lists`, { accounts: [" acc-One ", "acc-One", "acc-two"], orderCodes: ["OC1"] });
    let row = await db.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(stringList(row.accounts)).toEqual(["acc-One", "acc-two"]);
    await svc.addOccurrence(yara, t.id, { accounts: ["acc-two", "acc-3"], orderCodes: ["OC2"] });
    row = await db.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(stringList(row.accounts)).toEqual(["acc-One", "acc-two", "acc-3"]);
    expect(stringList(row.orderCodes)).toEqual(["OC1", "OC2"]);
    await svc.updateField(yara, t.id, "orderCodes", ["OC9", "OC9"]);
    row = await db.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(stringList(row.orderCodes)).toEqual(["OC9"]);

    const find = (q: string) => db.task.findMany({ where: { id: t.id, OR: [{ accounts: { array_contains: [q] } }, { occurrences: { some: { accounts: { array_contains: [q] } } } }] }, select: { id: true } });
    expect(await find("acc-3")).toHaveLength(1);
    expect(await find("acc-one")).toHaveLength(0); // exact, like PostgreSQL's has
    expect(await find("acc")).toHaveLength(0);
  });

  it("merging a request into another moves its accounts", async () => {
    const target = await ask(`${mark} merge target`, { accounts: ["m-1"] });
    const source = await ask(`${mark} merge source`, { accounts: ["m-1", "m-2"], orderCodes: ["MO-1"] });
    await svc.transition(lead, source.id, "merge", { targetTaskId: target.id });
    const row = await db.task.findUniqueOrThrow({ where: { id: target.id }, include: { occurrences: true } });
    expect(stringList(row.accounts)).toEqual(["m-1", "m-2"]);
    expect(stringList(row.orderCodes)).toEqual(["MO-1"]);
    expect(row.occurrences.map((o) => stringList(o.accounts))).toEqual([["m-1", "m-2"]]);
  });

  it("reads the working days back as numbers", async () => {
    invalidateWorkspaceConfig();
    expect((await getWorkspaceConfig()).calendar.workingDays).toEqual([6, 0, 1, 2, 3, 4]);
  });
});

describe("search", () => {
  it("title search ignores case, as ILIKE did", async () => {
    await ask(`${mark} Shipping Label Blurry`);
    expect(await db.task.count({ where: { title: { contains: `${mark} shipping label` } } })).toBe(1);
    expect(await db.task.count({ where: { title: { contains: `${mark} SHIPPING LABEL` } } })).toBe(1);
  });

  it("possible duplicates rank similar open titles", async () => {
    const t = await ask(`${mark} courier pickup never arrives`);
    const dups = await possibleDuplicates(projectId, `${mark} courier pickup does not arrive`);
    expect(dups[0]?.id).toBe(t.id);
    expect(await possibleDuplicates(projectId, `${mark} courier pickup does not arrive`, t.id)).not.toContainEqual(expect.objectContaining({ id: t.id }));
  });
});

describe("constraints", () => {
  it("rejects an attachment with no owner, or two", async () => {
    const t = await ask(`${mark} attach`);
    const base = { uploadedById: yara.id, fileName: "a.png", mime: "image/png", size: BigInt(1) };
    await expect(db.attachment.create({ data: { ...base, storageKey: `${mark}/none` } })).rejects.toThrow();
    const c = await svc.addComment(lead, t.id, { body: "x" });
    await expect(db.attachment.create({ data: { ...base, storageKey: `${mark}/two`, taskId: t.id, commentId: c.id } })).rejects.toThrow();
    await expect(db.attachment.create({ data: { ...base, storageKey: `${mark}/one`, taskId: t.id } })).resolves.toBeTruthy();
  });

  it("keeps storage keys longer than 191 characters", async () => {
    const t = await ask(`${mark} key`);
    const storageKey = `uploads/${crypto.randomUUID()}/${crypto.randomUUID()}/${"f".repeat(120)}.png`;
    expect(storageKey.length).toBeGreaterThan(191);
    await expect(db.attachment.create({ data: { uploadedById: yara.id, fileName: "f.png", mime: "image/png", size: BigInt(1), storageKey, taskId: t.id } })).resolves.toBeTruthy();
  });

  it("session tokens compare exactly (case matters)", async () => {
    const exp = new Date(Date.now() + 60_000);
    const token = `${mark}AbC`;
    await db.session.create({ data: { userId: yara.id, token, expiresAt: exp } });
    await db.session.create({ data: { userId: yara.id, token: token.toLowerCase(), expiresAt: exp } });
    expect((await db.session.findUnique({ where: { token } }))?.token).toBe(token);
    expect(await db.session.findUnique({ where: { token: token.toUpperCase() } })).toBeNull();
    await db.session.deleteMany({ where: { token: { startsWith: mark } } });
  });
});

describe("order and time", () => {
  it("puts NULL where PostgreSQL did when asked (asc: last, desc: first)", async () => {
    const a = await db.release.create({ data: { number: `${mark}-a`, state: "upcoming", type: "planned", targetDate: new Date("2030-01-02"), createdById: lead.id } });
    const b = await db.release.create({ data: { number: `${mark}-b`, state: "upcoming", type: "planned", targetDate: null, createdById: lead.id } });
    const where = { number: { startsWith: mark } };
    expect((await db.release.findMany({ where, orderBy: { targetDate: { sort: "asc", nulls: "last" } } })).map((r) => r.id)).toEqual([a.id, b.id]);
    expect((await db.release.findMany({ where, orderBy: { targetDate: { sort: "desc", nulls: "first" } } })).map((r) => r.id)).toEqual([b.id, a.id]);
    await db.release.deleteMany({ where });
  });

  it("stores instants in UTC whatever the server time zone", async () => {
    const before = Date.now();
    const t = await ask(`${mark} time`);
    const row = await db.task.findUniqueOrThrow({ where: { id: t.id } });
    // createdAt comes from the database default; it must be the same instant as the app clock.
    expect(Math.abs(row.createdAt.getTime() - before)).toBeLessThan(10_000);
    const due = new Date("2026-03-29T23:30:00.123Z");
    await db.task.update({ where: { id: t.id }, data: { dueAt: due } });
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).dueAt?.toISOString()).toBe(due.toISOString());
  });

  it("holiday dates come back as the same calendar day", async () => {
    const h = await db.holiday.findFirstOrThrow({ orderBy: { date: "asc" } });
    expect(h.date.toISOString()).toMatch(/T00:00:00\.000Z$/);
  });
});

describe("rows written in the same instant keep the order they were written in", () => {
  it("incident timeline: Reported comes before ABG alerted", async () => {
    const m = await db.member.findUniqueOrThrow({ where: { id: yara.id } });
    const me: CurrentMember = { id: m.id, name: m.name, email: m.email, handle: m.handle, role: m.role, teamId: m.teamId, side: "vendoor" };
    for (let i = 0; i < 5; i++) {
      const inc = await openIncident(me, { kind: "down", scope: `${mark} scope ${i}`, alert: true });
      const row = await db.incident.findUniqueOrThrow({ where: { id: inc.id }, include: { timeline: { orderBy: [{ at: "asc" }, { id: "asc" }] } } });
      expect(row.timeline.map((e) => e.kind)).toEqual(["reported", "alert_sent"]);
    }
  });

  it("undo right after a status change goes back to the previous status", async () => {
    const t = await ask(`${mark} undo`);
    await svc.transition(lead, t.id, "accept", { priority: "medium" });
    await svc.undoLastTransition(lead, t.id);
    expect((await db.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe("triage");
  });
});

describe("concurrent writes", () => {
  it("parallel requests in one project get distinct numbers", async () => {
    const made = await Promise.all(Array.from({ length: 12 }, (_, i) => ask(`${mark} parallel ${i}`)));
    const keys = made.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
