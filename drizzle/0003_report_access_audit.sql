CREATE TABLE "report_access_logs" (
  "id" uuid PRIMARY KEY,
  "report_id" uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" bigint NOT NULL
);
CREATE INDEX "idx_report_access_report_time" ON "report_access_logs"("report_id","created_at");
