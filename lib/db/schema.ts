/**
 * v6 Database Schema
 *
 * Migrated from archive/oldapp/lib/db/schema.ts
 * Key changes from v5:
 * - Renamed 'Document' table to 'Artifact' (document → artifact)
 * - Renamed 'document_kind' enum to 'artifact_kind'
 * - Updated foreign key references accordingly
 *
 * @see archive/oldapp/lib/db/schema.ts for v5 source
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm"
import { relations } from "drizzle-orm"
import {
	boolean,
	foreignKey,
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"

// =============================================================================
// Enums
// =============================================================================

/**
 * Visibility setting for chats - controls whether chats are public or private
 */
export const visibilityEnum = pgEnum("visibility", ["public", "private"])

/**
 * Message role - identifies the sender type in a conversation
 */
export const roleEnum = pgEnum("role", ["user", "assistant", "system"])

/**
 * Artifact kind - identifies the type of artifact content
 * @deprecated Use 'artifactKindEnum' - renamed from 'document_kind'
 */
export const artifactKindEnum = pgEnum("artifact_kind", [
	"text",
	"code",
	"image",
	"sheet",
])

// =============================================================================
// User Table
// =============================================================================

/**
 * User accounts in the system
 *
 * @property id - Unique identifier (UUID)
 * @property email - User email address (unique)
 * @property passwordHash - Hashed password (null for OAuth/guest users)
 * @property createdAt - Account creation timestamp
 * @property lastLogin - Last successful login timestamp
 */
export const user = pgTable("User", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 128 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	lastLogin: timestamp("last_login", { withTimezone: true }),
})

/** User select model - represents a user row from the database */
export type User = InferSelectModel<typeof user>

/** User insert model - represents data needed to create a user */
export type NewUser = InferInsertModel<typeof user>

// =============================================================================
// Chat Table
// =============================================================================

/**
 * Chat conversations
 *
 * @property id - Unique identifier (UUID)
 * @property createdAt - Conversation creation timestamp
 * @property updatedAt - Last update timestamp
 * @property title - Conversation title (defaults to "New Chat")
 * @property userId - Owner user ID (cascades on delete)
 * @property visibility - Public or private visibility
 * @property lastContext - Last usage context (for state restoration)
 */
export const chat = pgTable(
	"Chat",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		title: text("title").notNull().default("New Chat"),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		visibility: visibilityEnum("visibility").notNull().default("private"),
		/** Last context for state restoration - typed as AppUsage | null */
		lastContext: jsonb("last_context").$type<unknown | null>(),
	},
	(t) => ({
		/** Index for querying chats by user, sorted by creation date */
		userCreatedIdx: index("chat_user_created_idx").on(
			t.userId,
			t.createdAt,
		),
	}),
)

/** Chat select model - represents a chat row from the database */
export type Chat = InferSelectModel<typeof chat>

/** Chat insert model - represents data needed to create a chat */
export type NewChat = InferInsertModel<typeof chat>

/** Chat update model - represents data that can be updated on a chat */
export type UpdateChat = Partial<NewChat>

// =============================================================================
// Message Table
// =============================================================================

/**
 * Messages within chat conversations
 *
 * @property id - Unique identifier (UUID)
 * @property chatId - Parent chat ID (cascades on delete)
 * @property role - Message sender role (user/assistant/system)
 * @property parts - Message content parts (structured content)
 * @property attachments - File attachments metadata
 * @property createdAt - Message creation timestamp
 */
export const message = pgTable(
	"Message_v2",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, { onDelete: "cascade" }),
		role: roleEnum("role").notNull(),
		/** Structured message parts (content blocks) */
		parts: jsonb("parts").notNull(),
		/** File attachments metadata */
		attachments: jsonb("attachments").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => ({
		/** Index for querying messages by chat, sorted by creation date */
		chatCreatedIdx: index("message_chat_created_idx").on(
			t.chatId,
			t.createdAt,
		),
		/**
		 * Composite index for rate limiting queries (getMessageCountByUserId)
		 * Optimizes queries that filter by chatId, createdAt, and role
		 */
		chatCreatedRoleIdx: index("message_chat_created_role_idx").on(
			t.chatId,
			t.createdAt,
			t.role,
		),
	}),
)

/** Message select model - represents a message row from the database */
export type DBMessage = InferInsertModel<typeof message>

/** Message row type - alias for select model */
export type MessageRow = InferSelectModel<typeof message>

/** Message type with inferred parts and attachments */
export type Message = InferSelectModel<typeof message>

/** Message insert model - represents data needed to create a message */
export type NewMessage = InferInsertModel<typeof message>

/** Message update model - represents data that can be updated on a message */
export type UpdateMessage = Partial<NewMessage>

// =============================================================================
// Vote Table
// =============================================================================

/**
 * Message votes (upvotes/downvotes)
 *
 * Uses composite primary key: (chatId, messageId, userId)
 *
 * @property chatId - Chat ID (cascades on delete)
 * @property messageId - Message ID (cascades on delete)
 * @property userId - User who voted (cascades on delete)
 * @property isUpvoted - Vote direction (true = upvote, false = downvote)
 */
export const vote = pgTable(
	"Vote_v2",
	{
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, { onDelete: "cascade" }),
		messageId: uuid("message_id")
			.notNull()
			.references(() => message.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		isUpvoted: boolean("is_upvoted").notNull().default(true),
	},
	(table) => {
		return {
			/** Composite primary key ensures one vote per user per message */
			pk: primaryKey({
				columns: [table.chatId, table.messageId, table.userId],
			}),
		}
	},
)

/** Vote select model - represents a vote row from the database */
export type Vote = InferSelectModel<typeof vote>

/** Vote insert model - represents data needed to create a vote */
export type NewVote = InferInsertModel<typeof vote>

// =============================================================================
// Artifact Table (renamed from Document in v5)
// =============================================================================

/**
 * Artifacts - versioned content created during chats
 *
 * Renamed from 'Document' in v5 to 'Artifact' in v6.
 * Uses composite primary key: (id, createdAt) for versioning support.
 *
 * @property id - Artifact identifier (shared across versions)
 * @property createdAt - Version creation timestamp (part of composite PK)
 * @property title - Artifact title
 * @property content - Artifact content (text, code, etc.)
 * @property kind - Artifact type (text/code/image/sheet)
 * @property userId - Owner user ID (cascades on delete)
 * @property chatId - Associated chat ID (cascades on delete)
 * @property updatedAt - Last update timestamp
 */
export const artifact = pgTable(
	"Artifact",
	{
		id: uuid("id").notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		title: text("title").notNull(),
		content: text("content"),
		kind: artifactKindEnum("kind").notNull().default("text"),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, {
				onDelete: "cascade",
			}),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			/** Composite primary key enables versioning */
			pk: primaryKey({ columns: [table.id, table.createdAt] }),
			/** Index for querying artifacts by user */
			userIdx: index("artifact_user_idx").on(table.userId),
			/** Index for querying artifacts by chat */
			chatIdx: index("artifact_chat_idx").on(table.chatId),
		}
	},
)

/** Artifact select model - represents an artifact row from the database */
export type Artifact = InferSelectModel<typeof artifact>

/** Artifact insert model - represents data needed to create an artifact */
export type NewArtifact = InferInsertModel<typeof artifact>

/** Artifact update model - represents data that can be updated on an artifact */
export type UpdateArtifact = Partial<NewArtifact>

// =============================================================================
// Suggestion Table
// =============================================================================

/**
 * AI-generated suggestions for artifact modifications
 *
 * @property id - Unique identifier (UUID)
 * @property artifactId - Target artifact ID
 * @property artifactCreatedAt - Target artifact version timestamp
 * @property originalText - Original text to be replaced
 * @property suggestedText - Suggested replacement text
 * @property description - Optional description of the suggestion
 * @property isResolved - Whether the suggestion has been applied/dismissed
 * @property userId - User who owns the suggestion (cascades on delete)
 * @property createdAt - Suggestion creation timestamp
 */
export const suggestion = pgTable(
	"Suggestion",
	{
		id: uuid("id").notNull().defaultRandom(),
		artifactId: uuid("artifact_id").notNull(),
		artifactCreatedAt: timestamp("artifact_created_at", {
			withTimezone: true,
		}).notNull(),
		originalText: text("original_text").notNull(),
		suggestedText: text("suggested_text").notNull(),
		description: text("description"),
		isResolved: boolean("is_resolved").notNull().default(false),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		/** Primary key */
		pk: primaryKey({ columns: [table.id] }),
		/** Foreign key reference to artifact (composite) */
		artifactRef: foreignKey({
			columns: [table.artifactId, table.artifactCreatedAt],
			foreignColumns: [artifact.id, artifact.createdAt],
		}),
		/** Index for querying suggestions by artifact */
		artifactIdx: index("suggestion_artifact_idx").on(table.artifactId),
	}),
)

/** Suggestion select model - represents a suggestion row from the database */
export type Suggestion = InferSelectModel<typeof suggestion>

/** Suggestion insert model - represents data needed to create a suggestion */
export type NewSuggestion = InferInsertModel<typeof suggestion>

/** Suggestion update model - represents data that can be updated on a suggestion */
export type UpdateSuggestion = Partial<NewSuggestion>

// =============================================================================
// Legacy Compatibility Types (for migration support)
// =============================================================================

/**
 * @deprecated Use 'Artifact' instead. Kept for migration compatibility.
 * This type alias helps during the transition from v5 'Document' to v6 'Artifact'.
 */
export type Document = Artifact

/**
 * @deprecated Use 'NewArtifact' instead. Kept for migration compatibility.
 */
export type NewDocument = NewArtifact

/**
 * @deprecated Use 'artifactKindEnum' instead. Kept for migration compatibility.
 */
export const documentKindEnum = artifactKindEnum

// =============================================================================
// Drizzle Relations
// =============================================================================

/**
 * User relations
 * A user has many chats, messages, artifacts, votes, and suggestions
 */
export const userRelations = relations(user, ({ many }) => ({
	chats: many(chat),
	messages: many(message),
	artifacts: many(artifact),
	votes: many(vote),
	suggestions: many(suggestion),
}))

/**
 * Chat relations
 * A chat belongs to a user and has many messages, artifacts, and votes
 */
export const chatRelations = relations(chat, ({ one, many }) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id],
	}),
	messages: many(message),
	artifacts: many(artifact),
	votes: many(vote),
}))

/**
 * Message relations
 * A message belongs to a chat and has many votes
 */
export const messageRelations = relations(message, ({ one, many }) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id],
	}),
	votes: many(vote),
}))

/**
 * Vote relations
 * A vote belongs to a user, chat, and message
 */
export const voteRelations = relations(vote, ({ one }) => ({
	user: one(user, {
		fields: [vote.userId],
		references: [user.id],
	}),
	chat: one(chat, {
		fields: [vote.chatId],
		references: [chat.id],
	}),
	message: one(message, {
		fields: [vote.messageId],
		references: [message.id],
	}),
}))

/**
 * Artifact relations
 * An artifact belongs to a user and chat, and has many suggestions
 */
export const artifactRelations = relations(artifact, ({ one, many }) => ({
	user: one(user, {
		fields: [artifact.userId],
		references: [user.id],
	}),
	chat: one(chat, {
		fields: [artifact.chatId],
		references: [chat.id],
	}),
	suggestions: many(suggestion),
}))

/**
 * Suggestion relations
 * A suggestion belongs to a user and artifact
 */
export const suggestionRelations = relations(suggestion, ({ one }) => ({
	user: one(user, {
		fields: [suggestion.userId],
		references: [user.id],
	}),
	artifact: one(artifact, {
		fields: [suggestion.artifactId, suggestion.artifactCreatedAt],
		references: [artifact.id, artifact.createdAt],
	}),
}))
