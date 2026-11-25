-- Figma alignment: five priority levels, release deploy state, incident closing summary. Written to be re-runnable.

-- Priority: urgent becomes highest, add lowest.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'Priority' AND e.enumlabel = 'urgent') THEN
    ALTER TYPE "Priority" RENAME VALUE 'urgent' TO 'highest';
  END IF;
END $$;
ALTER TYPE "Priority" ADD VALUE IF NOT EXISTS 'lowest';

-- Release: a release is the deployment event. upcoming = Draft, released = Live, rolled_back = Rolled back.
ALTER TYPE "ReleaseState" ADD VALUE IF NOT EXISTS 'rolled_back';
ALTER TABLE "Release" ADD COLUMN IF NOT EXISTS "deployedById" TEXT;
ALTER TABLE "Release" ADD COLUMN IF NOT EXISTS "deployNote" TEXT;
ALTER TABLE "Release" ADD COLUMN IF NOT EXISTS "rolledBackAt" TIMESTAMPTZ;
ALTER TABLE "Release" ADD COLUMN IF NOT EXISTS "rollbackReason" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Release_deployedById_fkey') THEN
    ALTER TABLE "Release" ADD CONSTRAINT "Release_deployedById_fkey" FOREIGN KEY ("deployedById") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Incident: closing summary (summary, impact, resolution) and typed timeline entries.
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS "resolution" TEXT;
ALTER TABLE "IncidentTimelineEntry" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'update';
