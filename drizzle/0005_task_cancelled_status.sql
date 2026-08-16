ALTER TABLE "analysis_tasks" DROP CONSTRAINT "analysis_tasks_status_check";
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_status_check"
  CHECK ("status" IN ('pending','running','completed','failed','cancelled'));
