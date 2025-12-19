ALTER TABLE "Document" ALTER COLUMN "chat_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Message_v2" DROP COLUMN IF EXISTS "metadata";