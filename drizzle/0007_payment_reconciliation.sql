ALTER TABLE "orders" ADD COLUMN "refund_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "duplicate_payment" boolean DEFAULT false NOT NULL;