CREATE INDEX IF NOT EXISTS "Chat_userId_idx" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Chat_createdAt_idx" ON "Chat" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Message_v2_chatId_idx" ON "Message_v2" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Message_v2_createdAt_idx" ON "Message_v2" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Stream_chatId_idx" ON "Stream" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "Suggestion_documentId_idx" ON "Suggestion" USING btree ("documentId");