-- Automatic weekly report: on by default, remembers which week was last sent so it never sends twice.
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "weeklyReportAuto" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "weeklyReportSentWeek" TEXT;
