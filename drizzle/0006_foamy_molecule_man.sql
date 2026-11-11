ALTER TABLE "auth_rate_limits" ADD COLUMN "id" text;--> statement-breakpoint
UPDATE "auth_rate_limits" SET "id" = "key" WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "auth_rate_limits" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_rate_limits" ADD CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key");
--> statement-breakpoint
ALTER TABLE "auth_rate_limits" DROP CONSTRAINT "auth_rate_limits_pkey";--> statement-breakpoint
ALTER TABLE "auth_rate_limits" ADD CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY("id");
