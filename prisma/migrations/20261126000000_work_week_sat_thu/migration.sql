-- Work week is Saturday to Thursday, 09:00 to 17:00, Friday off (Figma 8.3).
ALTER TABLE "Workspace" ALTER COLUMN "workingDays" SET DEFAULT ARRAY[6,0,1,2,3,4];
ALTER TABLE "Workspace" ALTER COLUMN "workDayStartMin" SET DEFAULT 540;
ALTER TABLE "Workspace" ALTER COLUMN "workDayEndMin" SET DEFAULT 1020;
-- Only move workspaces that still have the old untouched defaults.
UPDATE "Workspace" SET "workingDays" = ARRAY[6,0,1,2,3,4], "workDayStartMin" = 540, "workDayEndMin" = 1020
WHERE "workingDays" = ARRAY[0,1,2,3,4] AND "workDayStartMin" = 600 AND "workDayEndMin" = 1080;
