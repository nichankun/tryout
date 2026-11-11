CREATE TABLE "tryout_attempt_answers" (
	"attempt_id" uuid NOT NULL,
	"question_id" integer NOT NULL,
	"answer" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tryout_attempt_answers_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "tryout_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"submitted_at" timestamp,
	"history_id" uuid
);
--> statement-breakpoint
ALTER TABLE "tryout_attempt_answers" ADD CONSTRAINT "tryout_attempt_answers_attempt_id_tryout_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."tryout_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_attempt_answers" ADD CONSTRAINT "tryout_attempt_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_attempts" ADD CONSTRAINT "tryout_attempts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_attempts" ADD CONSTRAINT "tryout_attempts_package_id_tryout_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."tryout_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_attempts" ADD CONSTRAINT "tryout_attempts_history_id_tryout_histories_id_fk" FOREIGN KEY ("history_id") REFERENCES "public"."tryout_histories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tryout_attempts_owner_package_idx" ON "tryout_attempts" USING btree ("user_id","package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tryout_attempts_one_active_idx" ON "tryout_attempts" USING btree ("user_id","package_id") WHERE "tryout_attempts"."status" = 'in_progress';