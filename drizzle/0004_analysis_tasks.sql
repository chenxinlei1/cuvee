CREATE TABLE "analysis_tasks" (
  "id" uuid PRIMARY KEY,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "input" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "stage" text,
  "progress" integer NOT NULL DEFAULT 0,
  "result" jsonb,
  "error" text,
  "heartbeat" bigint,
  "created_at" bigint NOT NULL,
  "started_at" bigint,
  "finished_at" bigint,
  CONSTRAINT "analysis_tasks_status_check" CHECK ("status" IN ('pending','running','completed','failed'))
);
CREATE INDEX "idx_analysis_tasks_claim" ON "analysis_tasks" ("status","created_at");
CREATE INDEX "idx_analysis_tasks_owner_time" ON "analysis_tasks" ("owner_id","created_at");
