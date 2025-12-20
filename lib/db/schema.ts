import {
  pgTable,
  varchar,
  timestamp,
  text,
  uuid,
  json,
  boolean,
  primaryKey,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

export const visibilityEnum = pgEnum('visibility', ['public', 'private']);
export const roleEnum = pgEnum('role', ['user', 'assistant', 'system']);
export const artifactKindEnum = pgEnum('artifact_kind', ['text', 'code', 'image', 'sheet']);

export const user = pgTable('user', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const chat = pgTable('chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  title: text('title').notNull(),
  userId: uuid('user_id').notNull().references(() => user.id),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  context: json('context'),
});

export const message = pgTable('message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chat.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  chatCreatedIdx: index('message_chat_created_idx').on(table.chatId, table.createdAt),
}));

export const vote = pgTable('vote', {
  chatId: uuid('chat_id').notNull().references(() => chat.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => message.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id),
  isUpvoted: boolean('is_upvoted').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.messageId, table.userId] }),
}));

export const document = pgTable('document', {
  id: uuid('id').notNull().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  title: text('title').notNull(),
  content: text('content'),
  kind: artifactKindEnum('kind').notNull().default('text'),
  chatId: uuid('chat_id').references(() => chat.id, { onDelete: 'set null' }),
  userId: uuid('user_id').notNull().references(() => user.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.createdAt] }),
  userIdx: index('document_user_idx').on(table.userId),
  chatIdx: index('document_chat_idx').on(table.chatId),
}));

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

export type VisibilityType = 'public' | 'private';
export type RoleType = 'user' | 'assistant' | 'system';
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';
