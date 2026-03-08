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

// ── Enums ────────────────────────────────────────────────────

export const visibilityEnum = pgEnum("visibility", ["public", "private"])
export const roleEnum = pgEnum("role", ["user", "assistant", "system"])
export const artifactKindEnum = pgEnum("artifact_kind", ["text", "code", "image", "sheet"])

// ── Users ────────────────────────────────────────────────────

export const users = pgTable("User", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	email: varchar("email", { length: 128 }).unique(),
	passwordHash: varchar("password_hash", { length: 128 }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	lastLogin: timestamp("last_login", { withTimezone: true }),
})

// ── Chats ────────────────────────────────────────────────────

export const chats = pgTable(
	"Chat",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
		title: text("title").notNull().default("New Chat"),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		visibility: visibilityEnum("visibility").notNull().default("private"),
		model: text("model"),
	},
	(t) => ({
		userUpdatedIdx: index("chat_user_updated_idx").on(
			t.userId,
			t.updatedAt.desc(),
			t.id.desc(),
		),
	}),
)

// ── Messages ─────────────────────────────────────────────────

export const messages = pgTable(
	"Message_v2",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chats.id, { onDelete: "cascade" }),
		role: roleEnum("role").notNull(),
		parts: jsonb("parts").notNull(),
		attachments: jsonb("attachments").notNull().default([]),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(t) => ({
		chatCreatedIdx: index("message_chat_created_idx").on(t.chatId, t.createdAt),
	}),
)

// ── Votes ────────────────────────────────────────────────────

export const votes = pgTable(
	"Vote_v2",
	{
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chats.id, { onDelete: "cascade" }),
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		isUpvoted: boolean("is_upvoted").notNull().default(true),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.chatId, t.messageId, t.userId] }),
	}),
)

// ── Artifacts ────────────────────────────────────────────────

export const artifacts = pgTable(
	"Artifact",
	{
		id: uuid("id").notNull().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		title: text("title").notNull(),
		content: text("content"),
		kind: artifactKindEnum("kind").notNull().default("text"),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => chats.id, { onDelete: "cascade" }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.id, t.createdAt] }),
		userIdx: index("artifact_user_idx").on(t.userId),
		chatIdx: index("artifact_chat_idx").on(t.chatId),
	}),
)

// ── Suggestions ──────────────────────────────────────────────

export const suggestions = pgTable(
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
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.id] }),
		artifactRef: foreignKey({
			columns: [t.artifactId, t.artifactCreatedAt],
			foreignColumns: [artifacts.id, artifacts.createdAt],
		}).onDelete("cascade"),
		artifactIdx: index("suggestion_artifact_idx").on(t.artifactId),
	}),
)
