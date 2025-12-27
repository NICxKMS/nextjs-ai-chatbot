/**
 * Database Schema
 * Drizzle ORM table definitions for PostgreSQL
 *
 * Tables: user, chat, message, vote, document, suggestion
 * All tables use UUID primary keys and UTC timestamps
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";

// ============================================================================
// Enums
// ============================================================================

/** Chat visibility: public (shareable) or private (owner only) */
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);

/** Message role in conversation */
export const roleEnum = pgEnum("role", ["user", "assistant", "system", "tool"]);

/** Document content type */
export const documentKindEnum = pgEnum("document_kind", [
	"text",
	"code",
	"image",
	"sheet",
]);

// ============================================================================
// Tables
// ============================================================================

/**
 * User table
 * Stores authenticated user accounts
 */
export const user = pgTable("User", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 128 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	lastLogin: timestamp("last_login", { withTimezone: true }),
});

/**
 * Chat table
 * Represents a conversation session between user and AI
 */
export const chat = pgTable(
	"Chat",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull().default("New Chat"),
		visibility: visibilityEnum("visibility").notNull().default("private"),
		/** Usage context stored as JSON for model/provider tracking */
		lastContext: jsonb("last_context").$type<Record<string, unknown> | null>(),
	},
	(table) => ({
		userCreatedIdx: index("chat_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
	}),
);

/**
 * Message table
 * Stores individual messages within a chat conversation
 */
export const message = pgTable(
	"Message_v2",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, { onDelete: "cascade" }),
		role: roleEnum("role").notNull(),
		/** Message content parts (text, tool calls, etc.) */
		parts: jsonb("parts").notNull(),
		/** File attachments metadata */
		attachments: jsonb("attachments").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		chatCreatedIdx: index("message_chat_created_idx").on(
			table.chatId,
			table.createdAt,
		),
		/** Composite index for rate limiting queries */
		chatCreatedRoleIdx: index("message_chat_created_role_idx").on(
			table.chatId,
			table.createdAt,
			table.role,
		),
	}),
);

/**
 * Vote table
 * Stores user feedback (upvote/downvote) on messages
 * Uses composite primary key: chatId + messageId + userId
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
	(table) => ({
		pk: primaryKey({
			columns: [table.chatId, table.messageId, table.userId],
		}),
	}),
);

/**
 * Document table
 * Stores artifacts created during chat (code, text, images, sheets)
 * Uses composite primary key: id + createdAt for versioning
 */
export const document = pgTable(
	"Document",
	{
		id: uuid("id").notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		title: text("title").notNull(),
		content: text("content"),
		kind: documentKindEnum("kind").notNull().default("text"),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, { onDelete: "cascade" }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.id, table.createdAt] }),
		userIdx: index("document_user_idx").on(table.userId),
		chatIdx: index("document_chat_idx").on(table.chatId),
	}),
);

/**
 * Suggestion table
 * Stores AI-generated text suggestions for documents
 */
export const suggestion = pgTable(
	"Suggestion",
	{
		id: uuid("id").notNull().defaultRandom(),
		documentId: uuid("document_id").notNull(),
		documentCreatedAt: timestamp("document_created_at", {
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
		pk: primaryKey({ columns: [table.id] }),
		documentRef: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
		}).onDelete("cascade"),
		docIdx: index("suggestion_doc_idx").on(table.documentId),
	}),
);

// ============================================================================
// Type Exports (Drizzle Inference)
// ============================================================================

// User types
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

// Chat types
export type Chat = InferSelectModel<typeof chat>;
export type NewChat = InferInsertModel<typeof chat>;

// Message types
export type Message = InferSelectModel<typeof message>;
export type NewMessage = InferInsertModel<typeof message>;
export type DBMessage = InferInsertModel<typeof message>;
export type MessageRow = InferSelectModel<typeof message>;

// Vote types
export type Vote = InferSelectModel<typeof vote>;
export type NewVote = InferInsertModel<typeof vote>;

// Document types
export type Document = InferSelectModel<typeof document>;
export type NewDocument = InferInsertModel<typeof document>;

// Suggestion types
export type Suggestion = InferSelectModel<typeof suggestion>;
export type NewSuggestion = InferInsertModel<typeof suggestion>;

// Enum types
export type Visibility = "public" | "private";
export type MessageRole = "user" | "assistant" | "system" | "tool";
export type DocumentKind = "text" | "code" | "image" | "sheet";
