/**
 * Database Schema
 * Ref: 03-data-layer-optimal-design.md §3
 *
 * Extracted from OldApp: oldapp/lib/db/schema.ts
 */

import {
    boolean,
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

// Enums
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);
export const roleEnum = pgEnum("role", ["user", "assistant", "system"]);
export const documentKindEnum = pgEnum("document_kind", [
    "text",
    "code",
    "image",
    "sheet",
]);

// User table
export const user = pgTable("User", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    email: varchar("email", { length: 128 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    lastLogin: timestamp("last_login", { withTimezone: true }),
});

// Chat table
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
        lastContext: jsonb("last_context"),
    },
    (table) => [
        index("chat_user_created_idx").on(table.userId, table.createdAt),
    ]
);

// Message table (v2)
export const message = pgTable(
    "Message_v2",
    {
        id: uuid("id").primaryKey().notNull().defaultRandom(),
        chatId: uuid("chat_id")
            .notNull()
            .references(() => chat.id, { onDelete: "cascade" }),
        role: roleEnum("role").notNull(),
        parts: jsonb("parts").notNull(),
        attachments: jsonb("attachments"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("message_chat_created_idx").on(table.chatId, table.createdAt),
        index("message_chat_created_role_idx").on(
            table.chatId,
            table.createdAt,
            table.role
        ),
    ]
);

// Vote table (v2)
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
        isUpvoted: boolean("is_upvoted").notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.chatId, table.messageId, table.userId] }),
    ]
);

// Document table
export const document = pgTable(
    "Document",
    {
        id: uuid("id").notNull().defaultRandom(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        title: text("title").notNull(),
        content: text("content"),
        kind: documentKindEnum("kind").notNull().default("text"),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        chatId: uuid("chat_id").references(() => chat.id, {
            onDelete: "set null",
        }),
    },
    (table) => [primaryKey({ columns: [table.id, table.createdAt] })]
);

// Suggestion table
export const suggestion = pgTable("Suggestion", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("document_id").notNull(),
    documentCreatedAt: timestamp("document_created_at", { withTimezone: true })
        .notNull(),
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
});

// Type exports for Drizzle inference
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Chat = typeof chat.$inferSelect;
export type NewChat = typeof chat.$inferInsert;
export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;
export type Vote = typeof vote.$inferSelect;
export type NewVote = typeof vote.$inferInsert;
export type Document = typeof document.$inferSelect;
export type NewDocument = typeof document.$inferInsert;
export type Suggestion = typeof suggestion.$inferSelect;
export type NewSuggestion = typeof suggestion.$inferInsert;

// Visibility type
export type Visibility = "public" | "private";
