CREATE TYPE "auth_token_type" AS ENUM ('email_verification', 'password_reset');
ALTER TABLE "users" ADD COLUMN "email_verified_at" bigint;
-- Existing accounts predate verification and remain usable.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;

CREATE TABLE "auth_tokens" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "type" "auth_token_type" NOT NULL,
  "expires_at" bigint NOT NULL,
  "used_at" bigint,
  "created_at" bigint NOT NULL
);
CREATE INDEX "idx_auth_tokens_user_type" ON "auth_tokens" ("user_id", "type");

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "user_agent" text,
  "ip_address" text,
  "created_at" bigint NOT NULL,
  "last_seen_at" bigint NOT NULL,
  "expires_at" bigint NOT NULL,
  "revoked_at" bigint
);
CREATE INDEX "idx_sessions_user_active" ON "sessions" ("user_id", "expires_at");
