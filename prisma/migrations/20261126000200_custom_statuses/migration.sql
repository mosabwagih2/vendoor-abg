-- Custom statuses: extra labels inside one of the five steps. The workflow still runs on the fixed internal statuses.
CREATE TABLE IF NOT EXISTS "CustomStatus" (
  "id" TEXT NOT NULL,
  "stepGroup" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CustomStatus_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "customStatusId" TEXT;
DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "CustomStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Task_customStatusId_idx" ON "Task"("customStatusId");
