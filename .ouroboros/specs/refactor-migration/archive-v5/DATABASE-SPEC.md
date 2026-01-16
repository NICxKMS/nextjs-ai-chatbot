# Database Specification

**Version**: 1.0  
**ORM**: Drizzle  
**Database**: PostgreSQL (Vercel Postgres)  
**Schema Path**: `lib/db/schema.ts`  
**Migrations Path**: `lib/db/migrations/`  
**Created**: 2024-12-27  
**Status**: 🟢 Active

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Enums](#enums)
4. [Schema Definitions](#schema-definitions)
   - [User](#table-user)
   - [Chat](#table-chat)
   - [Message_v2](#table-message_v2)
   - [Document](#table-document)
   - [Suggestion](#table-suggestion)
   - [Vote_v2](#table-vote_v2)
5. [Repository Layer](#repository-layer)
6. [Cache Strategy](#cache-strategy)
7. [Migration Guide](#migration-guide)
8. [Type Exports](#type-exports)

---

## Overview

This specification documents the database schema for the Next.js AI Chatbot application. The schema is designed to support:

- **User Management**: Email-based authentication with optional password hash
- **Chat Sessions**: Multi-user chat with visibility controls
- **Message Storage**: AI SDK v2-compatible message format with JSONB parts
- **Document Artifacts**: Versioned document storage with multiple types
- **Suggestions**: AI-powered text suggestions linked to documents
- **Voting**: User feedback on assistant messages

### Design Principles

1. **UUID Primary Keys**: All tables use UUID for distributed-safe ID generation
2. **Cascade Deletes**: Related data is automatically cleaned up on parent deletion
3. **Timezone-Aware Timestamps**: All timestamps use `timestamptz` for proper timezone handling
4. **JSONB for Flexibility**: Message parts and context stored as JSONB for schema evolution
5. **Composite Keys**: Vote and Document use composite primary keys for efficiency

---

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Chat : owns
    User ||--o{ Document : creates
    User ||--o{ Suggestion : creates
    User ||--o{ Vote_v2 : casts
    
    Chat ||--o{ Message_v2 : contains
    Chat ||--o{ Document : has
    Chat ||--o{ Vote_v2 : receives
    
    Message_v2 ||--o{ Vote_v2 : receives
    
    Document ||--o{ Suggestion : has
    
    User {
        uuid id PK
        varchar email UK
        varchar password_hash
        timestamptz created_at
        timestamptz last_login
    }
    
    Chat {
        uuid id PK
        timestamptz created_at
        timestamptz updated_at
        uuid user_id FK
        text title
        visibility visibility
        jsonb last_context
    }
    
    Message_v2 {
        uuid id PK
        uuid chat_id FK
        role role
        jsonb parts
        jsonb attachments
        timestamptz created_at
    }
    
    Document {
        uuid id PK
        timestamptz created_at PK
        text title
        text content
        document_kind kind
        uuid user_id FK
        uuid chat_id FK
        timestamptz updated_at
    }
    
    Suggestion {
        uuid id PK
        uuid document_id FK
        timestamptz document_created_at FK
        text original_text
        text suggested_text
        text description
        boolean is_resolved
        uuid user_id FK
        timestamptz created_at
    }
    
    Vote_v2 {
        uuid chat_id PK_FK
        uuid message_id PK_FK
        uuid user_id PK_FK
        boolean is_upvoted
    }
```

---

## Enums

### visibility

**Values**: `public`, `private`

| Value | Description |
|-------|-------------|
| `public` | Chat is visible to all users |
| `private` | Chat is only visible to the owner |

### role

**Values**: `user`, `assistant`, `system`

| Value | Description |
|-------|-------------|
| `user` | Message from human user |
| `assistant` | Message from AI assistant |
| `system` | System-level message or prompt |

### document_kind

**Values**: `text`, `code`, `image`, `sheet`

| Value | Description |
|-------|-------------|
| `text` | Plain text document |
| `code` | Source code artifact |
| `image` | Image reference/metadata |
| `sheet` | Spreadsheet data |

---

## Schema Definitions

### Table: User

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L31-L38)  
**Table Name**: `"User"`

User accounts for the application. Supports email/password authentication.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK, NOT NULL | `gen_random_uuid()` | Primary key |
| `email` | `varchar(128)` | NOT NULL, UNIQUE | - | User email address |
| `password_hash` | `varchar(128)` | NULLABLE | - | Hashed password (null for OAuth) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Account creation timestamp |
| `last_login` | `timestamptz` | NULLABLE | - | Last login timestamp |

**Indexes**:
- `User_email_unique` - UNIQUE on `email`

**Relations**:
- `has_many`: Chat, Document, Suggestion, Vote_v2

**TypeScript Types**:
```typescript
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;
```

---

### Table: Chat

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L41-L64)  
**Table Name**: `"Chat"`

Chat sessions containing conversations between users and the AI assistant.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK, NOT NULL | `gen_random_uuid()` | Primary key |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Chat creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Last modification timestamp |
| `user_id` | `uuid` | FK → User.id, NOT NULL | - | Owner user ID |
| `title` | `text` | NOT NULL | `'New Chat'` | Chat title/summary |
| `visibility` | `visibility` | NOT NULL | `'private'` | Access visibility |
| `last_context` | `jsonb` | NULLABLE | - | AI continuation context |

**Indexes**:
- `chat_user_created_idx` - BTREE on `(user_id, created_at)` — Optimizes user chat listing

**Relations**:
- `belongs_to`: User (via `user_id`)
- `has_many`: Message_v2, Document, Vote_v2

**Foreign Keys**:
- `Chat_user_id_User_id_fk` → `User(id)` ON DELETE CASCADE

**TypeScript Types**:
```typescript
export type Chat = InferSelectModel<typeof chat>;
export type NewChat = InferInsertModel<typeof chat>;
```

---

### Table: Message_v2

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L67-L91)  
**Table Name**: `"Message_v2"`

Chat messages in AI SDK v2 format with JSONB parts for rich content.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK, NOT NULL | `gen_random_uuid()` | Primary key |
| `chat_id` | `uuid` | FK → Chat.id, NOT NULL | - | Parent chat ID |
| `role` | `role` | NOT NULL | - | Message sender role |
| `parts` | `jsonb` | NOT NULL | - | Message content parts (AI SDK format) |
| `attachments` | `jsonb` | NOT NULL | - | File attachments metadata |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Message creation timestamp |

**Indexes**:
- `message_chat_created_idx` - BTREE on `(chat_id, created_at)` — Optimizes message loading
- `message_chat_created_role_idx` - BTREE on `(chat_id, created_at, role)` — Optimizes rate limiting queries

**Relations**:
- `belongs_to`: Chat (via `chat_id`)
- `has_many`: Vote_v2

**Foreign Keys**:
- `Message_v2_chat_id_Chat_id_fk` → `Chat(id)` ON DELETE CASCADE

**TypeScript Types**:
```typescript
export type Message = InferSelectModel<typeof message>;
export type NewMessage = InferInsertModel<typeof message>;
export type DBMessage = InferInsertModel<typeof message>;
export type MessageRow = InferSelectModel<typeof message>;
```

**JSONB Schema - Parts**:
```typescript
// AI SDK MessagePart format
type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'image'; image: string | URL }
  | { type: 'file'; data: string; mimeType: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: object }
  | { type: 'tool-result'; toolCallId: string; result: unknown };
```

---

### Table: Document

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L113-L138)  
**Table Name**: `"Document"`

User documents and AI-generated artifacts with version history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK (composite), NOT NULL | `gen_random_uuid()` | Document identifier |
| `created_at` | `timestamptz` | PK (composite), NOT NULL | `now()` | Version timestamp |
| `title` | `text` | NOT NULL | - | Document title |
| `content` | `text` | NULLABLE | - | Document content |
| `kind` | `document_kind` | NOT NULL | `'text'` | Document type |
| `user_id` | `uuid` | FK → User.id, NOT NULL | - | Owner user ID |
| `chat_id` | `uuid` | FK → Chat.id, NOT NULL | - | Parent chat ID |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Last update timestamp |

**Primary Key**: Composite `(id, created_at)` — Enables version history

**Indexes**:
- `document_user_idx` - BTREE on `user_id` — Optimizes user document queries
- `document_chat_idx` - BTREE on `chat_id` — Optimizes chat artifact queries

**Relations**:
- `belongs_to`: User (via `user_id`), Chat (via `chat_id`)
- `has_many`: Suggestion

**Foreign Keys**:
- `Document_user_id_User_id_fk` → `User(id)` ON DELETE CASCADE
- `Document_chat_id_Chat_id_fk` → `Chat(id)` ON DELETE CASCADE

**TypeScript Types**:
```typescript
export type Document = InferSelectModel<typeof document>;
export type NewDocument = InferInsertModel<typeof document>;
```

**Version History Pattern**:
```typescript
// Get latest version
const latest = await db
  .select()
  .from(document)
  .where(eq(document.id, docId))
  .orderBy(desc(document.createdAt))
  .limit(1);

// Get all versions
const versions = await db
  .select()
  .from(document)
  .where(eq(document.id, docId))
  .orderBy(asc(document.createdAt));
```

---

### Table: Suggestion

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L141-L168)  
**Table Name**: `"Suggestion"`

AI-generated text suggestions linked to specific document versions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | `uuid` | PK, NOT NULL | `gen_random_uuid()` | Primary key |
| `document_id` | `uuid` | FK (composite), NOT NULL | - | Target document ID |
| `document_created_at` | `timestamptz` | FK (composite), NOT NULL | - | Target document version |
| `original_text` | `text` | NOT NULL | - | Original text to replace |
| `suggested_text` | `text` | NOT NULL | - | Suggested replacement |
| `description` | `text` | NULLABLE | - | Suggestion explanation |
| `is_resolved` | `boolean` | NOT NULL | `false` | Resolution status |
| `user_id` | `uuid` | FK → User.id, NOT NULL | - | User who owns the suggestion |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Creation timestamp |

**Indexes**:
- `suggestion_doc_idx` - BTREE on `document_id` — Optimizes document suggestion queries

**Relations**:
- `belongs_to`: User (via `user_id`), Document (via `document_id`, `document_created_at`)

**Foreign Keys**:
- `Suggestion_user_id_User_id_fk` → `User(id)` ON DELETE CASCADE
- `Suggestion_document_id_document_created_at_Document_id_created_at_fk` → `Document(id, created_at)` ON DELETE CASCADE

**TypeScript Types**:
```typescript
export type Suggestion = InferSelectModel<typeof suggestion>;
export type NewSuggestion = InferInsertModel<typeof suggestion>;
```

---

### Table: Vote_v2

**File**: [lib/db/schema.ts](../../lib/db/schema.ts#L94-L111)  
**Table Name**: `"Vote_v2"`

User votes on assistant messages for feedback collection.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `chat_id` | `uuid` | PK (composite), FK → Chat.id, NOT NULL | - | Chat containing the message |
| `message_id` | `uuid` | PK (composite), FK → Message_v2.id, NOT NULL | - | Voted message |
| `user_id` | `uuid` | PK (composite), FK → User.id, NOT NULL | - | Voting user |
| `is_upvoted` | `boolean` | NOT NULL | `true` | Vote direction (true=up, false=down) |

**Primary Key**: Composite `(chat_id, message_id, user_id)` — One vote per user per message

**Relations**:
- `belongs_to`: Chat (via `chat_id`), Message_v2 (via `message_id`), User (via `user_id`)

**Foreign Keys**:
- `Vote_v2_chat_id_Chat_id_fk` → `Chat(id)` ON DELETE CASCADE
- `Vote_v2_message_id_Message_v2_id_fk` → `Message_v2(id)` ON DELETE CASCADE
- `Vote_v2_user_id_User_id_fk` → `User(id)` ON DELETE CASCADE

**TypeScript Types**:
```typescript
export type Vote = InferSelectModel<typeof vote>;
export type NewVote = InferInsertModel<typeof vote>;
```

---

## Repository Layer

The data layer follows a modular organization with cached wrappers for performance.

### Directory Structure

```
lib/data/
├── base.ts              # Base utilities (isGuest, requireNonGuest)
├── types.ts             # DataContext, PaginationParams, etc.
├── index.ts             # Barrel exports
├── chat/                # Chat CRUD operations
│   ├── read.ts          # getChat, getChatWithMessages, listChats
│   ├── write.ts         # createChat, deleteChat, deleteAllChats
│   ├── update.ts        # updateChatTitle, updateChatVisibility
│   └── index.ts         # Barrel export
├── documents/
│   └── index.ts         # documentData object with get, getAll, save
├── votes/
│   └── index.ts         # voteData object with get, getByChatId, save
└── cached/              # Cache-integrated operations
    ├── chat.ts          # getChatCached, listChatsCached
    ├── documents.ts     # getDocumentCached
    ├── messages.ts      # getMessagesCached
    ├── suggestions.ts   # getSuggestionsCached
    └── votes.ts         # getVotesCached
```

### Repository: ChatRepository

**File**: [lib/data/chat/](../../lib/data/chat/)

| Method | Return Type | Description |
|--------|-------------|-------------|
| `getChat(chatId, ctx)` | `Promise<Chat \| null>` | Get chat by ID with IDOR protection |
| `getChatWithMessages(chatId, ctx)` | `Promise<ChatWithMessages \| null>` | Get chat with all messages |
| `listChats(ctx, params?)` | `Promise<PaginatedResult<Chat>>` | List user's chats with pagination |
| `createChat(data, ctx)` | `Promise<Chat>` | Create a new chat |
| `updateChatTitle(chatId, title, ctx)` | `Promise<Chat \| null>` | Update chat title |
| `updateChatVisibility(chatId, visibility, ctx)` | `Promise<Chat \| null>` | Update chat visibility |
| `updateChatContext(chatId, context, ctx)` | `Promise<Chat \| null>` | Update AI continuation context |
| `deleteChat(chatId, ctx)` | `Promise<boolean>` | Delete chat and related data (transaction) |
| `deleteAllChats(ctx)` | `Promise<number>` | Delete all user chats (transaction) |
| `touchChat(chatId, ctx)` | `Promise<boolean>` | Update timestamp only |

### Repository: DocumentRepository

**File**: [lib/data/documents/index.ts](../../lib/data/documents/index.ts)

| Method | Return Type | Description |
|--------|-------------|-------------|
| `documentData.get(documentId, ctx)` | `Promise<Document \| null>` | Get latest document version |
| `documentData.getAll(documentId, ctx)` | `Promise<Document[]>` | Get all document versions |
| `documentData.save(params, ctx)` | `Promise<Document>` | Save new document version |
| `documentData.delete(documentId, ctx)` | `Promise<boolean>` | Delete all document versions |

### Repository: VoteRepository

**File**: [lib/data/votes/index.ts](../../lib/data/votes/index.ts)

| Method | Return Type | Description |
|--------|-------------|-------------|
| `voteData.get(chatId, messageId, ctx)` | `Promise<Vote \| null>` | Get specific vote |
| `voteData.getByChatId(chatId, ctx)` | `Promise<Vote[]>` | Get all votes for a chat |
| `voteData.save(params, ctx)` | `Promise<Vote \| null>` | Upsert a vote |

### DataContext Type

```typescript
type DataContext = {
  userId: string;
  userType: 'guest' | 'authenticated';
  requestId?: string;
};
```

### Null Object Pattern

```typescript
// Empty context for null safety
export const EMPTY_DATA_CONTEXT: DataContext = {
  userId: '',
  userType: 'guest',
  requestId: undefined,
};
```

---

## Cache Strategy

The application uses a multi-layer caching strategy with Redis for persistence.

### Cache Key Patterns

**File**: [lib/cache/keys.ts](../../lib/cache/keys.ts)

| Entity | Key Pattern | Generator |
|--------|-------------|-----------|
| Chat Meta | `chat:{chatId}:{userId}:meta` | `CacheKeys.chatMeta(chatId, userId)` |
| Chat Messages | `chat:{chatId}:{userId}:msgs` | `CacheKeys.chatMessages(chatId, userId)` |
| User Chats List | `user:{userId}:chats` | `CacheKeys.userChats(userId)` |
| Document | `document:{documentId}:{userId}` | `CacheKeys.document(documentId, userId)` |
| Document Meta | `doc:{userId}:{documentId}:meta` | `CacheKeys.documentMeta(userId, documentId)` |
| Document Versions | `doc:{userId}:{documentId}:versions` | `CacheKeys.documentVersions(userId, documentId)` |
| User Documents | `user:{userId}:docs` | `CacheKeys.userDocuments(userId)` |
| Daily Quota | `quota:{userId}:{date}` | `CacheKeys.quota(userId, date)` |
| Hourly Quota | `quota:{userId}:hour:{dateHour}` | `CacheKeys.quotaHourly(userId, dateHour)` |
| Typing Indicator | `typing:{chatId}` | `CacheKeys.typingZset(chatId)` |
| Online Status | `online:{userId}` | `CacheKeys.online(userId)` |

### Cache TTL Configuration

**File**: [lib/cache/constants.ts](../../lib/cache/constants.ts)

| Constant | Value | Description |
|----------|-------|-------------|
| `GUEST_CACHE_TTL_SECONDS` | 604,800 (7 days) | Guest user data retention |
| `AUTH_CHAT_DATA_TTL_SECONDS` | 2,592,000 (30 days) | Authenticated user chat data |
| `QUOTA_TTL_SECONDS` | 90,000 (25 hours) | Daily quota expiry |
| `GUEST_SESSION_TTL_SECONDS` | 3,600 (1 hour) | Guest session lifetime |
| `AUTH_SESSION_TTL_SECONDS` | 86,400 (24 hours) | Auth session lifetime |
| `TYPING_INDICATOR_TTL_SECONDS` | 5 | Typing indicator expiry |
| `ONLINE_STATUS_TTL_SECONDS` | 60 | Online presence check |

### Cache Strategy by Operation

| Operation | Strategy | Cache Behavior |
|-----------|----------|----------------|
| **Read Chat** | Cache-first | Check cache → DB fallback → background warm |
| **List Chats** | Cache-first | ZSET for sorted list, DB fallback |
| **Create Chat** | Write-through | DB write → cache update |
| **Update Chat** | Write-through | DB write → cache invalidate |
| **Delete Chat** | Write-through | DB delete → cache delete |
| **Guest Read** | Cache-only | No DB access, cache is source of truth |
| **Guest Write** | Cache-only | Direct cache write, no DB persistence |

### Cache Invalidation Tags

**File**: [lib/cache/tags.ts](../../lib/cache/tags.ts)

```typescript
export const CacheTags = {
  chat: (chatId: string) => `chat:${chatId}`,
  userChats: (userId: string) => `user-chats:${userId}`,
  document: (documentId: string) => `document:${documentId}`,
  suggestions: (documentId: string) => `suggestions:${documentId}`,
};
```

---

## Migration Guide

### Prerequisites

1. Install Drizzle Kit: `pnpm add -D drizzle-kit`
2. Set `DATABASE_URL` in `.env.local`

### Configuration

**File**: [drizzle.config.ts](../../drizzle.config.ts)

```typescript
export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### Generate Migration

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Push schema directly (development only)
pnpm drizzle-kit push

# View current schema
pnpm drizzle-kit studio
```

### Run Migrations

```bash
# Apply pending migrations
pnpm drizzle-kit migrate
```

### Adding a New Table

1. **Define schema** in `lib/db/schema.ts`:
```typescript
export const newTable = pgTable('NewTable', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  // ... columns
}, (table) => ({
  // ... indexes
}));

export type NewTableType = InferSelectModel<typeof newTable>;
```

2. **Generate migration**:
```bash
pnpm drizzle-kit generate
```

3. **Review** generated SQL in `lib/db/migrations/`

4. **Apply migration**:
```bash
pnpm drizzle-kit migrate
```

5. **Add repository** in `lib/data/newTable/`:
```typescript
// lib/data/newTable/index.ts
export const newTableData = {
  get: async (id: string, ctx: DataContext) => { /* ... */ },
  create: async (data: NewTableInput, ctx: DataContext) => { /* ... */ },
  // ...
};
```

6. **Add cache keys** in `lib/cache/keys.ts` if needed

### Migration Best Practices

1. **Always review generated SQL** before applying
2. **Use transactions** for multi-table changes
3. **Add indexes** for frequently queried columns
4. **Consider cascade deletes** for related data
5. **Test migrations** in development before production

---

## Type Exports

### Safe Client Types

**File**: [lib/db/types.ts](../../lib/db/types.ts)

These types can be imported in client components:

```typescript
// Client-safe imports
export type {
  Chat,
  Document,
  Message,
  Suggestion,
  User,
  Visibility,
  Vote,
} from './schema';

// Composite types
export type ChatWithMessages = {
  chat: Chat;
  messages: Message[];
};

export type DocumentWithSuggestions = {
  document: Document;
  suggestions: Suggestion[];
};
```

### Schema Types

**File**: [lib/db/schema.ts](../../lib/db/schema.ts)

```typescript
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
```

---

## Appendix: SQL Schema

Full initial migration SQL:

```sql
-- Enums
CREATE TYPE "public"."document_kind" AS ENUM('text', 'code', 'image', 'sheet');
CREATE TYPE "public"."role" AS ENUM('user', 'assistant', 'system');
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');

-- Tables
CREATE TABLE "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(128) NOT NULL,
  "password_hash" varchar(128),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login" timestamp with time zone,
  CONSTRAINT "User_email_unique" UNIQUE("email")
);

CREATE TABLE "Chat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" text DEFAULT 'New Chat' NOT NULL,
  "visibility" "visibility" DEFAULT 'private' NOT NULL,
  "last_context" jsonb
);

CREATE TABLE "Message_v2" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "role" "role" NOT NULL,
  "parts" jsonb NOT NULL,
  "attachments" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "Document" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "kind" "document_kind" DEFAULT 'text' NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "chat_id" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "Document_id_created_at_pk" PRIMARY KEY("id","created_at")
);

CREATE TABLE "Suggestion" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "document_created_at" timestamp with time zone NOT NULL,
  "original_text" text NOT NULL,
  "suggested_text" text NOT NULL,
  "description" text,
  "is_resolved" boolean DEFAULT false NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id"),
  CONSTRAINT "Suggestion_document_fk" FOREIGN KEY ("document_id","document_created_at") 
    REFERENCES "Document"("id","created_at") ON DELETE CASCADE
);

CREATE TABLE "Vote_v2" (
  "chat_id" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "message_id" uuid NOT NULL REFERENCES "Message_v2"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "is_upvoted" boolean DEFAULT true NOT NULL,
  CONSTRAINT "Vote_v2_pk" PRIMARY KEY("chat_id","message_id","user_id")
);

-- Indexes
CREATE INDEX "chat_user_created_idx" ON "Chat" ("user_id","created_at");
CREATE INDEX "message_chat_created_idx" ON "Message_v2" ("chat_id","created_at");
CREATE INDEX "message_chat_created_role_idx" ON "Message_v2" ("chat_id","created_at","role");
CREATE INDEX "document_user_idx" ON "Document" ("user_id");
CREATE INDEX "document_chat_idx" ON "Document" ("chat_id");
CREATE INDEX "suggestion_doc_idx" ON "Suggestion" ("document_id");
```

---

## Summary

| Table | Columns | Primary Key | Foreign Keys | Indexes |
|-------|---------|-------------|--------------|---------|
| User | 5 | `id` (UUID) | - | 1 (email unique) |
| Chat | 7 | `id` (UUID) | User | 1 (user_id, created_at) |
| Message_v2 | 6 | `id` (UUID) | Chat | 2 (chat+created, chat+created+role) |
| Document | 8 | `(id, created_at)` | User, Chat | 2 (user_id, chat_id) |
| Suggestion | 9 | `id` (UUID) | User, Document | 1 (document_id) |
| Vote_v2 | 4 | `(chat_id, message_id, user_id)` | Chat, Message, User | - |

**Total**: 6 tables, 3 enums, 39 columns, 7 indexes
