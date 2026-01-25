CREATE INDEX IF NOT EXISTS "chat_user_id_idx" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_chat_id_idx" ON "Message_v2" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stream_chat_id_idx" ON "Stream" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestion_document_id_idx" ON "Suggestion" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vote_message_id_idx" ON "Vote_v2" USING btree ("messageId");