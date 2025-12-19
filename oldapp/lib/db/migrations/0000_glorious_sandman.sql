DO $$ BEGIN
 CREATE TYPE "public"."document_kind" AS ENUM('text', 'code', 'image', 'sheet');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('user', 'assistant', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."visibility" AS ENUM('public', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text DEFAULT 'New Chat' NOT NULL,
	"user_id" uuid NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"last_context" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Document" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"kind" "document_kind" DEFAULT 'text' NOT NULL,
	"user_id" uuid NOT NULL,
	"chat_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Document_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Message_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"parts" jsonb NOT NULL,
	"attachments" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Stream" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Suggestion" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_created_at" timestamp with time zone NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(128) NOT NULL,
	"password_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Vote_v2" (
	"chat_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_upvoted" boolean DEFAULT true NOT NULL,
	CONSTRAINT "Vote_v2_chat_id_message_id_user_id_pk" PRIMARY KEY("chat_id","message_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_document_id_document_created_at_Document_id_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."Document"("id","created_at") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_message_id_Message_v2_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."Message_v2"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_user_created_idx" ON "Chat" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_user_idx" ON "Document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_chat_idx" ON "Document" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_chat_created_idx" ON "Message_v2" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stream_chat_created_idx" ON "Stream" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestion_doc_idx" ON "Suggestion" USING btree ("document_id");