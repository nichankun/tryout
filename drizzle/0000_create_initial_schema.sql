CREATE TABLE "account" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"snap_token" text,
	"transaction_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "password_reset_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"kategori" text NOT NULL,
	"pertanyaan" text NOT NULL,
	"is_figural" boolean DEFAULT false,
	"figural_config" jsonb,
	"pilihan" jsonb NOT NULL,
	"pembahasan" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tryout_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" integer NOT NULL,
	"skor_twk" integer DEFAULT 0 NOT NULL,
	"skor_tiu" integer DEFAULT 0 NOT NULL,
	"skor_tkp" integer DEFAULT 0 NOT NULL,
	"total_skor" integer DEFAULT 0 NOT NULL,
	"is_lolos" boolean DEFAULT false NOT NULL,
	"jawaban_siswa" jsonb NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tryout_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" integer NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password_hash" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_tryout_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."tryout_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_package_id_tryout_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."tryout_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_histories" ADD CONSTRAINT "tryout_histories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tryout_histories" ADD CONSTRAINT "tryout_histories_package_id_tryout_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."tryout_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_package_id_tryout_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."tryout_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_package_id_idx" ON "orders" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "questions_package_id_idx" ON "questions" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tryout_histories_user_id_idx" ON "tryout_histories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tryout_histories_end_time_idx" ON "tryout_histories" USING btree ("end_time");--> statement-breakpoint
CREATE UNIQUE INDEX "user_access_user_package_idx" ON "user_access" USING btree ("user_id","package_id");--> statement-breakpoint
CREATE INDEX "user_access_user_id_idx" ON "user_access" USING btree ("user_id");
