ALTER TABLE "tryout_attempt_answers" ALTER COLUMN "answer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_attempt_answers" ADD COLUMN "is_flagged" boolean DEFAULT false NOT NULL;