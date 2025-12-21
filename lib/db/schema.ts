/**
 * Database Schema
 * Ref: 03-data-layer-optimal-design.md §3
 *
 * Extracted from OldApp: oldapp/lib/db/schema.ts
 */

import {
    pgTable,
    varchar,
    text,
    timestamp,
    uuid,
    jsonb,
    boolean,
    index,
    primaryKey,
    pgEnum,
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
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("passwordHash"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    lastLogin: timestamp("lastLogin"),
});

// Chat table
export const chat = pgTable(
    "Chat",
    {
        id: uuid("id").primaryKey().notNull().defaultRandom(),
        createdAt: timestamp("createdAt").notNull().defaultNow(),
        updatedAt: timestamp("updatedAt").notNull().defaultNow(),
        userId: uuid("userId")
            .notNull()
            .references(() => user.id),
        title: text("title").notNull(),
        visibility: visibilityEnum("visibility").notNull().default("private"),
        lastContext: jsonb("lastContext"),
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
        chatId: uuid("chatId")
            .notNull()
            .references(() => chat.id),
        role: roleEnum("role").notNull(),
        parts: jsonb("parts").notNull(),
        attachments: jsonb("attachments"),
        createdAt: timestamp("createdAt").notNull().defaultNow(),
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
        chatId: uuid("chatId")
            .notNull()
            .references(() => chat.id),
        messageId: uuid("messageId")
            .notNull()
            .references(() => message.id),
        userId: uuid("userId")
            .notNull()
            .references(() => user.id),
        isUpvoted: boolean("isUpvoted").notNull(),
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
        createdAt: timestamp("createdAt").notNull().defaultNow(),
        updatedAt: timestamp("updatedAt").notNull().defaultNow(),
        title: text("title").notNull(),
        content: text("content"),
        kind: documentKindEnum("kind").notNull().default("text"),
        userId: uuid("userId")
            .notNull()
            .references(() => user.id),
        chatId: uuid("chatId").references(() => chat.id),
    },
    (table) => [primaryKey({ columns: [table.id, table.createdAt] })]
);

// Suggestion table
export const suggestion = pgTable("Suggestion", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
        .notNull()
        .references(() => user.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
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
