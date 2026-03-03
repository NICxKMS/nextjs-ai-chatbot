import type { InferInsertModel, InferSelectModel } from "drizzle-orm"

import type { artifacts, chats, messages, suggestions, users, votes } from "@/lib/db/schema"

// ── Select types (read from DB) ──

export type User = InferSelectModel<typeof users>
export type Chat = InferSelectModel<typeof chats>
export type Message = InferSelectModel<typeof messages>
export type Artifact = InferSelectModel<typeof artifacts>
export type Vote = InferSelectModel<typeof votes>
export type Suggestion = InferSelectModel<typeof suggestions>

// ── Insert types (write to DB) ──

export type NewUser = InferInsertModel<typeof users>
export type NewChat = InferInsertModel<typeof chats>
export type NewMessage = InferInsertModel<typeof messages>
export type NewArtifact = InferInsertModel<typeof artifacts>
export type NewVote = InferInsertModel<typeof votes>
export type NewSuggestion = InferInsertModel<typeof suggestions>

// ── Enum types (from schema) ──

export type Visibility = "public" | "private"
export type MessageRole = "user" | "assistant" | "system"
export type ArtifactKind = "text" | "code" | "image" | "sheet"

// ── Composite types (used across features) ──

export type ChatWithMessages = Chat & {
	messages: Message[]
}

export type ArtifactWithVersions = {
	id: string
	userId: string
	chatId: string
	versions: Artifact[]
}
