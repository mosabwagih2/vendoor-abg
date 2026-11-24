CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS task_title_trgm ON "Task" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS task_desc_trgm ON "Task" USING gin (description gin_trgm_ops);
ALTER TABLE "Attachment" ADD CONSTRAINT attachment_one_owner CHECK (
  (("taskId" IS NOT NULL)::int + ("commentId" IS NOT NULL)::int + ("occurrenceId" IS NOT NULL)::int + ("incidentId" IS NOT NULL)::int) = 1
);
