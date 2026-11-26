/**
 * Applies prisma/migrations/* to the database without the Prisma CLI, for small hosts (cPanel) that run the
 * prebuilt deploy bundle. It keeps Prisma's own `_prisma_migrations` table, with the same checksum (sha256 of
 * migration.sql), so `prisma migrate deploy` / `migrate status` keep working against the same database.
 *
 * Usage (bundle): node migrate.mjs [migrations-dir]   Reads DATABASE_URL from the environment or ./.env.
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import mariadb from "mariadb";

const envFile = path.resolve(".env");
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);

const dir = path.resolve(process.argv[2] ?? "prisma/migrations");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const u = new URL(url);
const conn = await mariadb.createConnection({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: decodeURIComponent(u.pathname.slice(1)),
  multipleStatements: true,
});

try {
  // Some shared hosts default to MyISAM: 1000-byte keys (the init migration needs more) and no foreign keys.
  // The migrations do not name an engine, so pin InnoDB for this session.
  await conn.query("SET SESSION default_storage_engine = InnoDB");
  await conn.query(`CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
    \`id\` VARCHAR(36) PRIMARY KEY NOT NULL,
    \`checksum\` VARCHAR(64) NOT NULL,
    \`finished_at\` DATETIME(3),
    \`migration_name\` VARCHAR(255) NOT NULL,
    \`logs\` TEXT,
    \`rolled_back_at\` DATETIME(3),
    \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0
  ) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  const rows: { migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[] =
    await conn.query("SELECT migration_name, checksum, finished_at, rolled_back_at FROM `_prisma_migrations`");

  const failed = rows.filter((r) => !r.finished_at && !r.rolled_back_at);
  if (failed.length) {
    console.error(`[migrate] a previous migration failed and must be fixed by hand: ${failed.map((r) => r.migration_name).join(", ")}`);
    process.exit(1);
  }
  const applied = new Map(rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => [r.migration_name, r.checksum]));

  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();

  let count = 0;
  for (const name of names) {
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) console.warn(`[migrate] ${name} was edited after it was applied (checksum differs)`);
      continue;
    }
    const id = randomUUID();
    await conn.query(
      "INSERT INTO `_prisma_migrations` (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, NOW(3), 0)",
      [id, checksum, name],
    );
    try {
      await conn.query(sql);
    } catch (e) {
      await conn.query("UPDATE `_prisma_migrations` SET logs = ? WHERE id = ?", [String(e), id]);
      console.error(`[migrate] ${name} failed: ${e instanceof Error ? e.message : e}`);
      process.exit(1);
    }
    await conn.query("UPDATE `_prisma_migrations` SET finished_at = NOW(3), applied_steps_count = 1 WHERE id = ?", [id]);
    console.log(`[migrate] applied ${name}`);
    count++;
  }
  console.log(count ? `[migrate] ${count} migration(s) applied` : "[migrate] database is up to date");
} finally {
  await conn.end();
}
