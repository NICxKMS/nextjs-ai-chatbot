# NeonDB PostgreSQL Schema Documentation

## Overview

This document describes the complete database schema for the AI Chat application, including tables, columns, indexes, relationships, and high-use query patterns.

## Tables

### User

Stores authenticated and guest user accounts.

**Columns:**
- `id` (uuid, PK, default: random) - Unique user identifier
- `email` (varchar(128), unique, not null) - User email (guest emails prefixed with `guest-`)
- `password_hash` (varchar(128)) - Bcrypt password hash
- `created_at` (timestamp with timezone, not null, default: now()) - Account creation timestamp
- `last_login` (timestamp with timezone) - Last login timestamp

**Indexes:**
- Primary key on `id`
- Unique index on `email`

**Notes:**
- Guest users have emails like `guest-{timestamp}` and random password hashes
- Guest users are created via `createGuestUser()` but their chat data lives in Redis cache only

---

### Chat

Stores chat conversation metadata.

**Columns:**
- `id` (uuid, PK, default: random) - Unique chat identifier
- `created_at` (timestamp with timezone, not null, default: now()) - Chat creation timestamp
- `updated_at` (timestamp with timezone, not null, default: now()) - Last update timestamp
- `title` (text, not null, default: 'New Chat') - Chat title
- `user_id` (uuid, not null, FK → User.id, cascade delete) - Owner user ID
- `visibility` (visibility enum, not null, default: 'private') - Public or private visibility
- `last_context` (jsonb) - Last usage context (AppUsage type with model info, tokens, cost)

**Indexes:**
- Primary key on `id`
- Composite index `chat_user_created_idx` on (`user_id`, `created_at`) - Optimizes user chat list queries

**Foreign Keys:**
- `user_id` → `User.id` (cascade delete)

**Notes:**
- Authenticated users: persisted in DB and cached in Redis
- Guest users: cache-only (not persisted to DB)
- `last_context` stores token usage and cost information from the last message

---

### Message_v2

Stores chat messages with AI SDK parts format.

**Columns:**
- `id` (uuid, PK, default: random) - Unique message identifier
- `chat_id` (uuid, not null, FK → Chat.id, cascade delete) - Parent chat ID
- `role` (role enum, not null) - Message role: 'user' | 'assistant' | 'system'
- `parts` (jsonb, not null) - Message parts array (text, tool calls, tool results, reasoning)
- `attachments` (jsonb, not null) - Attachments array (files, images)
- `created_at` (timestamp with timezone, not null, default: now()) - Message creation timestamp

**Indexes:**
- Primary key on `id`
- Composite index `message_chat_created_idx` on (`chat_id`, `created_at`) - Optimizes message retrieval for chats
- Composite index `message_chat_created_role_idx` on (`chat_id`, `created_at`, `role`) - Optimizes rate limiting queries

**Foreign Keys:**
- `chat_id` → `Chat.id` (cascade delete)

**Notes:**
- Uses AI SDK message format with parts array
- Parts can include: text, tool-call, tool-result, reasoning blocks
- Authenticated users: persisted in DB and cached in Redis (denormalized with chat)
- Guest users: cache-only (not persisted to DB)

---

### Vote_v2

Stores user votes (upvote/downvote) on assistant messages.

**Columns:**
- `chat_id` (uuid, not null, FK → Chat.id, cascade delete) - Parent chat ID
- `message_id` (uuid, not null, FK → Message_v2.id, cascade delete) - Voted message ID
- `user_id` (uuid, not null, FK → User.id, cascade delete) - Voting user ID
- `is_upvoted` (boolean, not null, default: true) - True for upvote, false for downvote

**Indexes:**
- Composite primary key on (`chat_id`, `message_id`, `user_id`)

**Foreign Keys:**
- `chat_id` → `Chat.id` (cascade delete)
- `message_id` → `Message_v2.id` (cascade delete)
- `user_id` → `User.id` (cascade delete)

**Notes:**
- **Database-only feature** (no cache, not available for guest users)
- Users can change their vote (UPDATE if exists, INSERT otherwise)
- One vote per user per message

---

### Document

Stores artifact documents (text, code, images, sheets) with version history.

**Columns:**
- `id` (uuid, not null) - Document identifier (shared across versions)
- `created_at` (timestamp with timezone, not null, default: now()) - Version creation timestamp
- `title` (text, not null) - Document title
- `content` (text) - Document content (nullable for images)
- `kind` (document_kind enum, not null, default: 'text') - Document type: 'text' | 'code' | 'image' | 'sheet'
- `user_id` (uuid, not null, FK → User.id, cascade delete) - Owner user ID
- `chat_id` (uuid, not null, FK → Chat.id, cascade delete) - Associated chat ID
- `updated_at` (timestamp with timezone, not null, default: now()) - Version update timestamp

**Indexes:**
- Composite primary key on (`id`, `created_at`) - Allows multiple versions per document
- Index `document_user_idx` on `user_id` - Optimizes user document queries
- Index `document_chat_idx` on `chat_id` - Optimizes chat document queries

**Foreign Keys:**
- `user_id` → `User.id` (cascade delete)
- `chat_id` → `Chat.id` (cascade delete)

**Notes:**
- Each document can have multiple versions (composite PK on id + created_at)
- Authenticated users: persisted in DB and cached in Redis (denormalized with versions array)
- Guest users: cache-only (not persisted to DB)
- Cache stores all versions in a single denormalized structure

---

### Suggestion

Stores AI-generated suggestions for document edits.

**Columns:**
- `id` (uuid, PK, default: random) - Unique suggestion identifier
- `document_id` (uuid, not null) - Target document ID
- `document_created_at` (timestamp with timezone, not null) - Target document version timestamp
- `original_text` (text, not null) - Original text to be replaced
- `suggested_text` (text, not null) - Suggested replacement text
- `description` (text) - Optional description of the suggestion
- `is_resolved` (boolean, not null, default: false) - Whether suggestion has been accepted/rejected
- `user_id` (uuid, not null, FK → User.id, cascade delete) - Owner user ID
- `created_at` (timestamp with timezone, not null, default: now()) - Suggestion creation timestamp

**Indexes:**
- Primary key on `id`
- Index `suggestion_doc_idx` on `document_id` - Optimizes document suggestion queries
- Composite foreign key on (`document_id`, `document_created_at`) → (`Document.id`, `Document.created_at`)

**Foreign Keys:**
- `user_id` → `User.id` (cascade delete)
- (`document_id`, `document_created_at`) → (`Document.id`, `Document.created_at`)

**Notes:**
- **Database-only feature** (no cache, not available for guest users)
- Tied to specific document version via composite foreign key
- Used by AI to suggest edits/improvements to documents

---

## Enums

### visibility
- `public` - Chat visible to anyone with link
- `private` - Chat visible only to owner

### role
- `user` - User message
- `assistant` - AI assistant message
- `system` - System message

### document_kind
- `text` - Plain text document
- `code` - Code artifact
- `image` - Image artifact
- `sheet` - Spreadsheet/table artifact

---

## Relationships

```
User (1) ──< (N) Chat
User (1) ──< (N) Document
User (1) ──< (N) Suggestion
User (M) ──< (N) Vote (M:N with Message via Vote table)

Chat (1) ──< (N) Message_v2
Chat (1) ──< (N) Document
Chat (1) ──< (N) Vote

Message_v2 (1) ──< (N) Vote

Document (1) ──< (N) Suggestion
```

**Key Cascade Behaviors:**
- Deleting a User → cascades to all their Chats, Documents, Suggestions, Votes
- Deleting a Chat → cascades to all Messages, Documents, Votes in that chat
- Deleting a Message → cascades to all Votes on that message
- Deleting a Document (version) → cascades to all Suggestions for that version

---

## High-Use Query Patterns

### 1. getChatById
```sql
SELECT * FROM "Chat" WHERE id = $1;
```
- Used in: Chat page loads, API route authorization
- Cache-first: Check `chat:{chatId}:{userId}` in Redis before DB query
- Frequency: Very high (every chat page load, every API call)

### 2. getChatWithMessagesById
```sql
-- Chat query
SELECT * FROM "Chat" WHERE id = $1;
-- Messages query
SELECT * FROM "Message_v2" WHERE chat_id = $1 ORDER BY created_at ASC;
```
- Used in: Chat page loads (server component)
- Cache-first: Single Redis GET returns denormalized chat + messages
- Optimization: Eliminates N+1 pattern with single cache fetch
- Frequency: Very high (every chat page load)

### 3. getMessagesByChatId
```sql
SELECT * FROM "Message_v2" 
WHERE chat_id = $1 
ORDER BY created_at ASC;
```
- Used in: Chat streaming, message history
- Cache-first: Check chat cache for messages array
- Index used: `message_chat_created_idx`
- Frequency: High

### 4. getChatsByUserId (with pagination)
```sql
SELECT * FROM "Chat" 
WHERE user_id = $1 
  AND created_at > $2  -- if startingAfter
ORDER BY created_at DESC 
LIMIT $3;
```
- Used in: Sidebar chat history, infinite scroll
- Cache-first: Guest users use Redis ZSET `user:{userId}:chats`
- Index used: `chat_user_created_idx`
- Frequency: High

### 5. getDocumentsById
```sql
SELECT * FROM "Document" 
WHERE id = $1 
ORDER BY created_at ASC;
```
- Used in: Loading document versions
- Cache-first: Check `document:{documentId}:{userId}` in Redis
- Index used: Primary key on (id, created_at)
- Frequency: Medium

### 6. saveMessages (bulk insert)
```sql
INSERT INTO "Message_v2" (id, chat_id, role, parts, attachments, created_at) 
VALUES ($1, $2, $3, $4, $5, $6), ...
ON CONFLICT (id) DO NOTHING;
```
- Used in: Chat streaming completion
- Writes to both cache (append to messages array) and DB (authenticated only)
- Optimization: Bulk insert with ON CONFLICT to avoid duplicates
- Frequency: Very high (every chat message)

### 7. saveMessagesAndContext (optimized batch)
```sql
-- Insert messages
INSERT INTO "Message_v2" (...) VALUES (...);
-- Update chat context
UPDATE "Chat" SET last_context = $1, updated_at = NOW() WHERE id = $2;
```
- Used in: Chat streaming completion with usage tracking
- Cache optimization: Single cache operation using `batchUpdateChatCache`
- Frequency: Very high (every chat completion)

### 8. getMessageCountByUserId (rate limiting)
```sql
SELECT COUNT(id) FROM "Message_v2"
INNER JOIN "Chat" ON "Message_v2".chat_id = "Chat".id
WHERE "Chat".user_id = $1
  AND "Message_v2".created_at >= $2
  AND "Message_v2".role = 'user';
```
- Used in: Rate limiting check before processing chat
- Index used: `message_chat_created_role_idx` (composite index optimized for this query)
- Frequency: Very high (every chat request)

### 9. deleteMessagesByChatIdAfterTimestamp
```sql
-- Find messages to delete
SELECT id FROM "Message_v2" 
WHERE chat_id = $1 AND created_at >= $2;
-- Delete votes
DELETE FROM "Vote_v2" WHERE chat_id = $1 AND message_id = ANY($3);
-- Delete messages
DELETE FROM "Message_v2" WHERE chat_id = $1 AND id = ANY($3);
```
- Used in: Message regeneration, chat editing
- Cache: Also deletes from cache via `deleteMessagesFromCacheAfterTimestamp`
- Frequency: Low-medium

### 10. updateChatTitleById
```sql
UPDATE "Chat" SET title = $1, updated_at = NOW() WHERE id = $2;
```
- Used in: Title generation after first message
- Cache: Updates cache in parallel via `updateChatTitleInCache`
- Optimization: Only fetches userId field (not full chat) for cache update
- Frequency: High (every new chat)

---

## Performance Optimizations

### Index Strategy
1. **Composite indexes** for common multi-column filters
2. **Foreign key indexes** automatically created for joins
3. **Partial indexes** not used (could be added for visibility filtering)

### Query Patterns
1. **Parallel execution**: DB and cache operations run in parallel where safe
2. **Batch operations**: Use `Promise.all()` for independent queries
3. **Selective fields**: Fetch only needed columns (e.g., userId for cache updates)
4. **Prepared statements**: Disabled (`prepare: false`) for serverless compatibility

### Connection Pooling
```typescript
// Environment-aware pool configuration
Vercel Fluid: { max: 5, idle_timeout: 10 }
Production: { max: 10, idle_timeout: 20 }
Development: { max: 3, idle_timeout: 30 }
```

### Cache Strategy
- **Cache-first**: Always check Redis before DB
- **Denormalized storage**: Chat includes messages array (eliminates N+1)
- **Atomic operations**: Use Redis pipelines for multi-key updates
- **Background warming**: Non-blocking cache population after DB query

---

## Migration Notes

### Guest User Behavior
- **Database**: Guest users ARE created in User table (for FK integrity)
- **Chat/Message/Document**: Guest data is cache-only (not persisted to DB)
- **Vote/Suggestion**: Not available for guest users (DB-only features)

### Version History
- `Message_v2` and `Vote_v2` tables indicate schema migrations from v1
- Document versioning uses composite PK instead of separate version table

