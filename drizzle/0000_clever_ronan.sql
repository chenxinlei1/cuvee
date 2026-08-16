CREATE TYPE "public"."grant_target_kind" AS ENUM('user', 'organization');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('chateau', 'negociant', 'distributor', 'buyer');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('platformAdmin', 'wineryAdmin', 'wineryStaff', 'buyerAdmin', 'buyerStaff');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."report_visibility" AS ENUM('private', 'restricted', 'workspace');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"size" bigint NOT NULL,
	"mime" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "documents_owner_id_content_hash_unique" UNIQUE("owner_id","content_hash")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"email" text NOT NULL,
	"attempted_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_id" uuid NOT NULL,
	"target_kind" "grant_target_kind" NOT NULL,
	"target_value" text NOT NULL,
	"expires_at" bigint,
	"can_download" boolean DEFAULT false NOT NULL,
	"granted_by" uuid NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "report_grants_report_id_target_kind_target_value_unique" UNIQUE("report_id","target_kind","target_value")
);
--> statement-breakpoint
CREATE TABLE "report_permissions" (
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"granted_by" uuid NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "report_permissions_report_id_user_id_pk" PRIMARY KEY("report_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"region_id" text NOT NULL,
	"region_name" text NOT NULL,
	"vintage" text NOT NULL,
	"risk_score" bigint NOT NULL,
	"quality_band" text,
	"result_json" jsonb NOT NULL,
	"generated_at" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"visibility" "report_visibility" DEFAULT 'private' NOT NULL,
	CONSTRAINT "reports_owner_id_generated_at_unique" UNIQUE("owner_id","generated_at")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"organization_type" "organization_type",
	"organization_name" text,
	"created_at" bigint NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_grants" ADD CONSTRAINT "report_grants_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_grants" ADD CONSTRAINT "report_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_permissions" ADD CONSTRAINT "report_permissions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_permissions" ADD CONSTRAINT "report_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_permissions" ADD CONSTRAINT "report_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_user_time" ON "audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_owner_time" ON "documents" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_email_time" ON "login_attempts" USING btree ("email","attempted_at");--> statement-breakpoint
CREATE INDEX "idx_report_grants_report" ON "report_grants" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_report_permissions_user" ON "report_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reports_owner_time" ON "reports" USING btree ("owner_id","created_at");