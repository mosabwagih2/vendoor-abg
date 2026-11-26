#!/usr/bin/env python3
"""Rebuilds prisma/migrations/*_init_mysql/migration.sql from the schema.

Prisma writes most of it (`prisma migrate diff --from-empty`); this adds what Prisma cannot express on MySQL.
Usage: pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | python3 scripts/mysql-init-migration.py > prisma/migrations/20261126100000_init_mysql/migration.sql
"""
import sys

sql = sys.stdin.read()


def rep(old: str, new: str, count: int = 1) -> None:
    global sql
    found = sql.count(old)
    if found != count:
        sys.exit(f"expected {count} of {old!r}, found {found}")
    sql = sql.replace(old, new)


# MySQL 8 refuses plain defaults on TEXT and JSON columns; an expression default works (8.0.13+, MariaDB 10.2+).
rep("`description` MEDIUMTEXT NOT NULL DEFAULT (_utf8mb4\\'\\'),", "`description` MEDIUMTEXT NOT NULL DEFAULT (''),")
rep("`notes` MEDIUMTEXT NOT NULL DEFAULT (_utf8mb4\\'\\'),", "`notes` MEDIUMTEXT NOT NULL DEFAULT (''),")
rep("`workingDays` JSON NOT NULL,", "`workingDays` JSON NOT NULL DEFAULT (JSON_ARRAY(6, 0, 1, 2, 3, 4)),")
rep("`accounts` JSON NOT NULL,", "`accounts` JSON NOT NULL DEFAULT (JSON_ARRAY()),", 2)
rep("`orderCodes` JSON NOT NULL,", "`orderCodes` JSON NOT NULL DEFAULT (JSON_ARRAY()),", 2)

HEADER = """-- MySQL schema for the Vendoor × ABG tracker (replaces the PostgreSQL migration history on this branch).
-- Built by scripts/mysql-init-migration.py from `prisma migrate diff --from-empty`, plus what Prisma cannot express:
--   * TEXT and JSON columns take their defaults as expressions, e.g. DEFAULT (''): MySQL 8 refuses plain defaults on them.
--   * Lists (accounts, order codes, working days) are JSON arrays; MySQL has no array columns.
--   * Exact comparison (utf8mb4_bin) where PostgreSQL compared exactly and it matters: secret lookups (session token,
--     verification, rate limit key, invitation hash) and reaction emoji (utf8mb4_unicode_ci treats all emoji as equal).
--     Everything else uses utf8mb4_unicode_ci, so text search ignores case like ILIKE did.
--   * The "one owner per attachment" check from the PostgreSQL search migration is kept below.
-- Needs MySQL 8.0.16+ (or MariaDB 10.4+) for expression defaults and CHECK constraints.

"""

FOOTER = """
-- Exact comparison where PostgreSQL compared exactly.
ALTER TABLE `session` MODIFY `token` VARCHAR(191) NOT NULL COLLATE utf8mb4_bin;
ALTER TABLE `verification` MODIFY `identifier` VARCHAR(255) NOT NULL COLLATE utf8mb4_bin;
ALTER TABLE `verification` MODIFY `value` MEDIUMTEXT NOT NULL COLLATE utf8mb4_bin;
ALTER TABLE `rate_limit` MODIFY `key` VARCHAR(255) NOT NULL COLLATE utf8mb4_bin;
ALTER TABLE `Invitation` MODIFY `tokenHash` VARCHAR(191) NOT NULL COLLATE utf8mb4_bin;
ALTER TABLE `Reaction` MODIFY `emoji` VARCHAR(191) NOT NULL COLLATE utf8mb4_bin;

-- An attachment belongs to exactly one of: task, comment, occurrence, incident.
ALTER TABLE `Attachment` ADD CONSTRAINT `attachment_one_owner` CHECK (
  ((`taskId` IS NOT NULL) + (`commentId` IS NOT NULL) + (`occurrenceId` IS NOT NULL) + (`incidentId` IS NOT NULL)) = 1
);
"""

sys.stdout.write(HEADER + sql.strip() + "\n" + FOOTER)
