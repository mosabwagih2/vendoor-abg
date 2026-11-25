-- Service targets for the new "lowest" priority, and Figma defaults for the others (only where still at the old defaults).
INSERT INTO "SlaTarget" ("id", "workspaceId", "priority", "firstResponseMinutes", "resolutionMinutes")
SELECT gen_random_uuid()::text, w."id", 'lowest'::"Priority", 960, 4800 FROM "Workspace" w
WHERE NOT EXISTS (SELECT 1 FROM "SlaTarget" s WHERE s."workspaceId" = w."id" AND s."priority" = 'lowest');
UPDATE "SlaTarget" SET "resolutionMinutes" = 2400 WHERE "priority" = 'low' AND "resolutionMinutes" IS NULL;
