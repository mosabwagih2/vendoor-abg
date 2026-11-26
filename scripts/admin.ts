/**
 * Makes a person the workspace owner (super admin) and sets their password, asking for it on the terminal
 * so it never lands in shell history, logs or chat.
 *
 *   node admin.mjs you@example.com                              # existing member, or a new one
 *   node admin.mjs you@example.com --rename-from old@example.test  # take over a seeded member (keeps their tasks)
 *   node admin.mjs you@example.com --name "Your Name"
 *
 * Reads DATABASE_URL from the environment or ./.env. The workspace must exist (run the seed first).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const; // same as src/server/auth.ts

const envFile = path.resolve(".env");
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const email = args.find((a) => a.includes("@") && !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--rename-from")?.toLowerCase();
const renameFrom = flag("--rename-from")?.toLowerCase();
if (!email) {
  console.error('Usage: node admin.mjs you@example.com [--rename-from seeded@example.test] [--name "Your Name"]');
  process.exit(1);
}

// One readline for every question, so piped input (tests) is not lost between them; typing is not echoed.
let muted = false;
const rl = createInterface({
  input: process.stdin,
  output: new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  }),
  terminal: process.stdin.isTTY ?? false,
});
const lines = rl[Symbol.asyncIterator]();
async function ask(question: string): Promise<string> {
  process.stdout.write(question);
  muted = true;
  const { value } = await lines.next();
  muted = false;
  process.stdout.write("\n");
  return (value ?? "").replace(/\r$/, "");
}

const db = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
try {
  const ws = await db.workspace.findFirst();
  if (!ws) throw new Error("No workspace yet. Run the seed first (node seed.mjs).");

  let member = await db.member.findUnique({ where: { email } });
  if (!member && renameFrom) {
    const old = await db.member.findUnique({ where: { email: renameFrom } });
    if (!old) throw new Error(`No member with ${renameFrom}`);
    member = await db.member.update({ where: { id: old.id }, data: { email } });
    console.log(`${renameFrom} is now ${email}`);
  }
  if (!member) {
    const team = await db.team.findFirst({ where: { workspaceId: ws.id, side: "requester" } });
    if (!team) throw new Error("No requester team in the workspace");
    const base = email.split("@")[0].replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "admin";
    let handle = base;
    for (let n = 2; await db.member.findUnique({ where: { handle } }); n++) handle = `${base}-${n}`;
    member = await db.member.create({ data: { name: flag("--name") ?? base, handle, email, emailVerified: true, role: "owner", teamId: team.id, status: "active" } });
    console.log(`Created ${email}`);
  }

  const password = await ask("New password (not shown): ");
  if (password.length < 8) throw new Error("The password must have at least 8 characters.");
  if ((await ask("Repeat it: ")) !== password) throw new Error("The two passwords differ.");
  const hashed = await hash(password, ARGON);

  await db.member.update({
    where: { id: member.id },
    data: { role: "owner", status: "active", emailVerified: true, archivedAt: null, ...(flag("--name") ? { name: flag("--name") } : {}) },
  });
  const account = await db.account.findFirst({ where: { userId: member.id, providerId: "credential" } });
  if (account) await db.account.update({ where: { id: account.id }, data: { password: hashed } });
  else await db.account.create({ data: { accountId: member.id, providerId: "credential", userId: member.id, password: hashed } });
  // Sign out any old sessions of this person.
  await db.session.deleteMany({ where: { userId: member.id } });
  console.log(`${email} is the owner (super admin). Sign in with this email and the password you typed.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  rl.close();
  await db.$disconnect();
}
