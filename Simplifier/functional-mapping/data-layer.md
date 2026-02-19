# Data Layer Functional Mapping

## Overview

This document maps the functional structure of the data layer, documenting repository functions, service operations, and data flow patterns.

---

## Database Schema (`lib/db/schema.ts`)

### Entity Models

| Entity | Table Name | Primary Key | Key Relationships |
|--------|------------|-------------|-------------------|
| **User** | `User` | `id` (UUID) | Has many: chats, messages, artifacts, votes, suggestions |
| **Chat** | `Chat` | `id` (UUID) | Belongs to User; Has many: messages, artifacts, votes |
| **Message** | `Message_v2` | `id` (UUID) | Belongs to Chat; Has many: votes |
| **Vote** | `Vote_v2` | Composite (`chatId`, `messageId`, `userId`) | Belongs to User, Chat, Message |
| **Artifact** | `Artifact` | Composite (`id`, `createdAt`) | Belongs to User, Chat; Has many: suggestions |
| **Suggestion** | `Suggestion` | `id` (UUID) | Belongs to User, Artifact |

### Enums

```typescript
visibilityEnum: "public" | "private"
roleEnum: "user" | "assistant" | "system"
artifactKindEnum: "text" | "code" | "image" | "sheet"
```

---

## Repository Layer (`lib/data/repositories/`)

### BaseRepository (Abstract)

The [`BaseRepository`](lib/data/repositories/base.repository.ts:211) class provides generic CRUD operations with integrated caching:

| Method | Operation | Cache Behavior |
|--------|-----------|----------------|
| `findById(id, context)` | Read single entity | Cache-through (check cache, then DB on miss) |
| `findMany(options, context)` | Read multiple entities | List cache for simple queries |
| `exists(id, context)` | Check existence | Uses findById |
| `count(options, context)` | Count entities | No caching |
| `create(data, context)` | Create entity | Write-through (DB + cache) |
| `createMany(data, context)` | Create multiple | Sequential creates + cache updates |
| `update(id, data, context)` | Update entity | Write-through + list invalidation |
| `delete(id, context)` | Delete entity | Cache invalidation |
| `deleteMany(ids, context)` | Delete multiple | Sequential deletes + cache invalidation |

### ChatRepository

**Extends:** `BaseRepository<Chat, NewChat, UpdateChat>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Find chat by ID with ownership check | `SELECT * FROM "Chat" WHERE id = ? AND userId = ?` |
| `doFindMany` | Find chats with filters | `SELECT * FROM "Chat" WHERE ... ORDER BY createdAt DESC` |
| `doCount` | Count chats with filters | `SELECT count(id) FROM "Chat" WHERE ...` |
| `doCreate` | Create new chat | `INSERT INTO "Chat" VALUES (...)` |
| `doUpdate` | Update chat with ownership check | `UPDATE "Chat" SET ... WHERE id = ? AND userId = ?` |
| `doDelete` | Delete chat with ownership check | `DELETE FROM "Chat" WHERE id = ? AND userId = ?` |
| `findByUserId` | Paginated user chats | Cursor-based pagination with search/filter |
| `findWithMessages` | Chat with messages loaded | Chat + messages join query |

### MessageRepository

**Extends:** `BaseRepository<Message, NewMessage, UpdateMessage>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Find message by ID | `SELECT * FROM "Message_v2" WHERE id = ?` |
| `doFindMany` | Find messages with filters | `SELECT * FROM "Message_v2" WHERE chatId = ? ORDER BY createdAt ASC` |
| `doCount` | Count messages | `SELECT count(id) FROM "Message_v2" WHERE ...` |
| `doCreate` | Create message | `INSERT INTO "Message_v2" VALUES (...)` |
| `doUpdate` | Update message | `UPDATE "Message_v2" SET ... WHERE id = ?` |
| `doDelete` | Delete message | `DELETE FROM "Message_v2" WHERE id = ?` |
| `findByChatId` | Get all messages for chat | Paginated query by chatId |
| `saveWithContext` | Save messages + update chat context | Transactional multi-insert |
| `deleteAfterTimestamp` | Delete messages after time (regeneration) | `DELETE WHERE chatId = ? AND createdAt >= ?` |

### ArtifactRepository

**Extends:** `BaseRepository<Artifact, NewArtifact, Partial<NewArtifact>>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Find latest artifact version | `SELECT * FROM "Artifact" WHERE id = ? ORDER BY createdAt DESC LIMIT 1` |
| `doFindMany` | Find artifacts with filters | `SELECT * FROM "Artifact" WHERE ... ORDER BY createdAt DESC` |
| `doCount` | Count artifacts | `SELECT count(id) FROM "Artifact" WHERE ...` |
| `doCreate` | Create artifact version | `INSERT INTO "Artifact" VALUES (...)` |
| `doUpdate` | Update artifact | `UPDATE "Artifact" SET ... WHERE id = ? AND createdAt = ?` |
| `doDelete` | Delete artifact version | `DELETE FROM "Artifact" WHERE id = ? AND createdAt = ?` |
| `findAllVersions` | Get all versions of artifact | `SELECT * FROM "Artifact" WHERE id = ? ORDER BY createdAt DESC` |
| `findLatestVersion` | Get latest version | Same as doFindById |
| `saveVersion` | Create new version | `INSERT INTO "Artifact" VALUES (...)` |
| `deleteVersionsAfterTimestamp` | Rollback versions | `DELETE WHERE id = ? AND createdAt > ?` |

### VoteRepository

**Extends:** `BaseRepository<Vote, NewVote, Partial<NewVote>>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Not applicable (composite PK) | Throws error |
| `findByMessageId` | Get vote for message by user | `SELECT * FROM "Vote_v2" WHERE messageId = ? AND userId = ?` |
| `upsertVote` | Create or update vote | `INSERT ... ON CONFLICT DO UPDATE` |

### SuggestionRepository

**Extends:** `BaseRepository<Suggestion, NewSuggestion, UpdateSuggestion>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Find suggestion by ID | `SELECT * FROM "Suggestion" WHERE id = ?` |
| `findByArtifactId` | Get suggestions for artifact | `SELECT * FROM "Suggestion" WHERE artifactId = ?` |
| `resolve` | Mark suggestion as resolved | `UPDATE SET isResolved = true` |

### UserRepository

**Extends:** `BaseRepository<User, NewUser, UpdateUser>`

| Method | Purpose | Data Operation |
|--------|---------|----------------|
| `doFindById` | Find user by ID | `SELECT * FROM "User" WHERE id = ?` |
| `findByEmail` | Find user by email | `SELECT * FROM "User" WHERE email = ?` |
| `updateLastLogin` | Update login timestamp | `UPDATE SET lastLogin = NOW()` |

---

## Service Layer (`lib/data/services/`)

### ChatService

**Orchestrates:** ChatRepository, MessageRepository, VoteRepository

| Method | Purpose | Repositories Used |
|--------|---------|-------------------|
| `getWithMessages` | Get chat with all messages | ChatRepository, direct DB query |
| `getHistory` | Paginated chat history | ChatRepository |
| `getChatById` | Single chat with ownership check | ChatRepository |
| `createChat` | Create new chat | ChatRepository |
| `saveChat` | Save chat + messages (transactional) | Direct transaction (chat + message inserts) |
| `deleteChat` | Delete chat with cascade | Transactional delete (chat + messages + votes) |

### ArtifactService

**Orchestrates:** ArtifactRepository, SuggestionRepository

| Method | Purpose | Repositories Used |
|--------|---------|-------------------|
| `getArtifact` | Get artifact with ownership check | ArtifactRepository |
| `getArtifactWithSuggestions` | Get artifact + suggestions | ArtifactRepository, SuggestionRepository |
| `createArtifact` | Create new artifact | ArtifactRepository |
| `updateArtifact` | Update artifact content | ArtifactRepository |
| `addSuggestion` | Add suggestion to artifact | SuggestionRepository |

### AuthService

**Orchestrates:** UserRepository

| Method | Purpose | Repositories Used |
|--------|---------|-------------------|
| `authenticate` | Login user | UserRepository |
| `register` | Create new user | UserRepository |
| `validateSession` | Check session validity | UserRepository |

---

## Query Layer (`lib/data/queries/`)

Complex queries that don't fit the repository pattern:

### Chat Queries

| Function | Purpose | Query Type |
|----------|---------|------------|
| `getChatWithMessagesAndArtifacts` | Full chat data | Parallel queries (chat + messages + artifacts) |
| `searchChats` | Full-text search in messages | ILIKE on JSONB parts field |
| `getChatStats` | User chat statistics | Aggregation queries |
| `getChatsWithMessageCount` | Chats with counts | Subquery for message count |
| `getChatWithLatestMessage` | Chat preview | Join + limit 1 |
| `getChatsWithinDateRange` | Date-filtered chats | Range query on createdAt |

### User Queries

| Function | Purpose | Query Type |
|----------|---------|------------|
| `getUserStats` | User statistics | Aggregation |
| `getUserWithChats` | User with chat list | Join query |

---

## Data Flow Patterns

### Read Flow (Cache-Through)

```
API Route
    |
    v
Service Layer (business logic, auth checks)
    |
    v
Repository.findById()
    |
    +---> Cache Hit? ---> Return cached data
    |
    +---> Cache Miss? ---> DB Query ---> Cache Result ---> Return data
```

### Write Flow (Write-Through)

```
API Route
    |
    v
Service Layer (validation, business rules)
    |
    v
Repository.create/update/delete()
    |
    +---> DB Write
    |
    +---> Cache Update/Invalidate
    |
    v
Return result
```

### Transactional Flow

```
Service.saveChat()
    |
    v
withTransaction(async (tx) => {
    |
    +---> tx.insert(chat)
    |
    +---> tx.insert(messages)
    |
    +---> tx.update(chat context)
    |
    v
}) // Auto-rollback on error
```

### Guest-Aware Flow

```
guestAwareGet(key, fetcher, context)
    |
    +---> isGuest? ---> Cache-only (no DB fallback)
    |
    +---> !isGuest? ---> Standard cache-aside (cache + DB fallback)
```

---

## Key Observations

1. **Repository Pattern**: All data access goes through repositories with consistent caching
2. **Service Orchestration**: Services coordinate multi-repository operations with transactions
3. **Query Separation**: Complex queries (joins, aggregations, search) are in separate query modules
4. **Guest Strategy**: Special handling for guest users with cache-only operations
5. **Cursor Pagination**: Consistent pagination pattern across list queries
6. **Context Propagation**: `RepositoryContext` carries user info for ownership checks