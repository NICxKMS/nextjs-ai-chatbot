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
import type { AppUsage } from "../usage";

export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const roleEnum = pgEnum("role", ["user", "assistant", "system"]);
export const documentKindEnum = pgEnum("document_kind", [
	"text",
	"code",
	"image",
	"sheet",
]);

export const user = pgTable("User", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 128 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	lastLogin: timestamp("last_login", { withTimezone: true }),
});

export type User = InferSelectModel<typeof user>;

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
		lastContext: jsonb("last_context").$type<AppUsage | null>(),
	},
	(t) => ({
		userCreatedIdx: index("chat_user_created_idx").on(
			t.userId,
			t.createdAt
		),
	})
);

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable(
	"Message_v2",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chat.id, { onDelete: "cascade" }),
		role: roleEnum("role").notNull(),
		parts: jsonb("parts").notNull(),
		attachments: jsonb("attachments").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => ({
		chatCreatedIdx: index("message_chat_created_idx").on(
			t.chatId,
			t.createdAt
		),
		// Composite index for rate limiting query (getMessageCountByUserId)
		// Optimizes queries that filter by chatId, createdAt, and role
		chatCreatedRoleIdx: index("message_chat_created_role_idx").on(
			t.chatId,
			t.createdAt,
			t.role
		),
	})
);

export type DBMessage = InferInsertModel<typeof message>;

export type MessageRow = InferSelectModel<typeof message>;

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
			pk: primaryKey({
				columns: [table.chatId, table.messageId, table.userId],
			}),
		};
	}
);

export type Vote = InferSelectModel<typeof vote>;

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
			.references(() => chat.id, {
				onDelete: "cascade",
			}),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.id, table.createdAt] }),
			userIdx: index("document_user_idx").on(table.userId),
			chatIdx: index("document_chat_idx").on(table.chatId),
		};
	}
);

export type Document = InferSelectModel<typeof document>;

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
		}),
		docIdx: index("suggestion_doc_idx").on(table.documentId),
	})
);

export type Suggestion = InferSelectModel<typeof suggestion>;
