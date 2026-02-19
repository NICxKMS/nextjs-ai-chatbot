# Data Layer Pattern Consistency

## Overview

This document analyzes the consistency of patterns used across the data layer, including repository pattern implementation, service layer patterns, error handling, and caching strategies.

---

## Repository Pattern Implementation

### Pattern Definition

The repository pattern abstracts data access behind a clean interface:

```typescript
interface IReadRepository<T> {
  findById(id: string, context?: RepositoryContext): Promise<T | null>
  findMany(options?: FindManyOptions, context?: RepositoryContext): Promise<T[]>
  exists(id: string, context?: RepositoryContext): Promise<boolean>
  count(options?: CountOptions, context?: RepositoryContext): Promise<number>
}

interface IWriteRepository<T, TCreate, TUpdate> {
  create(data: TCreate, context?: RepositoryContext): Promise<T>
  createMany(data: TCreate[], context?: RepositoryContext): Promise<T[]>
  update(id: string, data: TUpdate, context?: RepositoryContext): Promise<T>
  delete(id: string, context?: RepositoryContext): Promise<boolean>
  deleteMany(ids: string[], context?: RepositoryContext): Promise<number>
}
```

### Consistency Analysis

| Repository | Implements IReadRepository | Implements IWriteRepository | Custom Methods |
|------------|---------------------------|---------------------------|----------------|
| ChatRepository | Yes | Yes | `findByUserId`, `findWithMessages` |
| MessageRepository | Yes | Yes | `findByChatId`, `saveWithContext`, `deleteAfterTimestamp` |
| ArtifactRepository | Yes | Yes | `findAllVersions`, `findLatestVersion`, `saveVersion`, `deleteVersionsAfterTimestamp` |
| VoteRepository | Partial* | Partial* | `findByMessageId`, `upsertVote` |
| SuggestionRepository | Yes | Yes | `findByArtifactId`, `resolve` |
| UserRepository | Yes | Yes | `findByEmail`, `updateLastLogin` |

*VoteRepository has composite primary key, so `findById` is not applicable.

### Pattern Adherence Score: 8/10

**Strengths:**
- Consistent interface implementation across repositories
- Clear separation between read and write operations
- Context propagation for ownership checks

**Inconsistencies:**
- VoteRepository's `findById` throws error (should not implement that interface method)
- Some repositories have many custom methods while others have few

---

## Service Layer Patterns

### Pattern Definition

Services orchestrate operations across multiple repositories and handle business logic:

```typescript
class ChatService {
  // Read operations - delegate to repository
  async getWithMessages(chatId: string, ctx: RepositoryContext): Promise<ChatWithMessages | null>
  async getHistory(pagination: PaginationParams, ctx: RepositoryContext): Promise<PaginatedResult<Chat>>
  
  // Write operations - may use transactions
  async saveChat(params: SaveChatParams, ctx: RepositoryContext): Promise<void>
  async deleteChat(chatId: string, ctx: RepositoryContext): Promise<DeleteChatResult>
}
```

### Consistency Analysis

| Service | Uses Transactions | Cross-Repo Operations | Error Handling |
|---------|------------------|----------------------|----------------|
| ChatService | Yes (saveChat, deleteChat) | Chat + Message + Vote | Consistent |
| ArtifactService | No | Artifact + Suggestion | Consistent |
| AuthService | No | User only | Consistent |

### Service Pattern Score: 7/10

**Strengths:**
- Consistent error handling with typed errors
- Transaction usage for multi-entity operations
- Clear separation from repository layer

**Inconsistencies:**
- Some services are thin wrappers (no added value)
- Inconsistent use of direct DB queries vs repository calls

**Example of Inconsistency:**

```typescript
// ChatService uses repository for some operations
const chatResult = await chatRepository.findById(chatId, ctx)

// But direct DB for others
const messages = await db.select().from(message).where(eq(message.chatId, chatId))
```

---

## Error Handling Patterns

### Pattern Definition

Errors should be typed and include context:

```typescript
// Expected pattern
throw new NotFoundError(`Chat not found: ${chatId}`, { chatId, userId })

// Error types
- NotFoundError: Entity not found
- ForbiddenError: Access denied
- InternalServerError: Unexpected failure
- ValidationError: Invalid input
- DatabaseError: DB operation failed
```

### Consistency Analysis

| Layer | Error Type Usage | Context Included | Logging |
|-------|-----------------|------------------|---------|
| Repositories | InternalServerError | Yes | Yes |
| Services | NotFoundError, ForbiddenError, InternalServerError | Yes | Yes |
| Queries | Throws raw errors | Varies | Yes |

### Error Handling Score: 8/10

**Strengths:**
- Consistent use of typed errors in repositories and services
- Context included in error objects
- Logging before throwing

**Inconsistencies:**
- Query layer throws raw errors without wrapping
- Some methods catch and re-throw unnecessarily

**Example of Good Pattern:**

```typescript
// lib/data/repositories/chat.repository.ts:169
catch (error) {
  logError("ChatRepository doFindById error", error as Error, { id })
  throw new InternalServerError(`Failed to find chat by ID: ${id}`, {
    id,
    error: (error as Error).message,
  })
}
```

**Example of Inconsistent Pattern:**

```typescript
// lib/data/queries/chat.queries.ts:130
catch (error) {
  logError("getChatWithMessagesAndArtifacts error", error as Error, { chatId })
  throw error  // Raw error, not wrapped
}
```

---

## Caching Patterns

### Pattern Definition

Cache-through for reads, write-through for writes:

```typescript
// Cache-through read
async findById(id: string, context?: RepositoryContext): Promise<T | null> {
  const key = this.cacheKey(id)
  
  // Check cache first
  const cached = await this.cache.get(key)
  if (cached.found && cached.value) {
    return cached.value
  }
  
  // Cache miss - fetch from DB
  const result = await this.doFindById(id, context)
  
  // Populate cache
  if (result) {
    await this.cache.set(key, result, { ttl: this.ttl })
  }
  
  return result
}

// Write-through write
async create(data: TCreate, context?: RepositoryContext): Promise<T> {
  const result = await this.doCreate(data, context)
  
  // Update cache
  await this.cache.set(this.cacheKey(result.id), result, { ttl: this.ttl })
  
  // Invalidate list cache
  await this.invalidateListCache()
  
  return result
}
```

### Consistency Analysis

| Repository | Cache-Through Read | Write-Through | List Invalidation |
|------------|-------------------|---------------|-------------------|
| ChatRepository | Yes | Yes | Yes |
| MessageRepository | Yes | Yes | Yes |
| ArtifactRepository | Yes | Yes | Yes |
| VoteRepository | Yes | Yes | Yes |
| SuggestionRepository | Yes | Yes | Yes |
| UserRepository | Yes | Yes | Yes |

### Caching Pattern Score: 9/10

**Strengths:**
- Consistent cache-through pattern across all repositories
- Proper list cache invalidation on writes
- TTL configuration per entity type

**Minor Inconsistencies:**
- MessageRepository has additional `cacheChatKey` for chat-scoped caching
- List cache doesn't account for different filter combinations

---

## Pagination Patterns

### Pattern Definition

Cursor-based pagination with consistent parameters:

```typescript
interface PaginationParams {
  limit: number
  startingAfter?: string | null
  endingBefore?: string | null
  searchQuery?: string | null
  fromDate?: Date | null
  toDate?: Date | null
}

interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
}
```

### Consistency Analysis

| Location | Uses PaginationParams | Returns PaginatedResult | Cursor Encoding |
|----------|----------------------|------------------------|-----------------|
| ChatRepository.findByUserId | Yes | Yes | Custom (updatedAt) |
| pagination.ts paginate() | CursorPaginationOptions | CursorPaginatedResult | Base64url |
| API Routes | Varies | Varies | Varies |

### Pagination Pattern Score: 6/10

**Issues:**
- Two different pagination interfaces (`PaginationParams` vs `CursorPaginationOptions`)
- Two different result types (`PaginatedResult` vs `CursorPaginatedResult`)
- ChatRepository implements custom pagination instead of using `paginate()` utility
- Inconsistent cursor encoding (ID-based vs timestamp-based)

**Recommendation:** Standardize on single pagination approach:

```typescript
// Unified pagination interface
interface PaginationOptions {
  limit: number
  cursor?: string  // Base64url encoded
  direction?: 'forward' | 'backward'
  filters?: Record<string, unknown>
}

interface PaginationResult<T> {
  items: T[]
  hasMore: boolean
  nextCursor: string | null
  prevCursor: string | null
}
```

---

## Context Propagation Patterns

### Pattern Definition

Repository context carries user information for authorization:

```typescript
interface RepositoryContext {
  userId: string
  isGuest: boolean
}

interface ServiceContext extends RepositoryContext {
  email?: string
  sessionId?: string
}
```

### Consistency Analysis

| Layer | Context Type | Ownership Checks | Guest Handling |
|-------|-------------|-----------------|----------------|
| Repositories | RepositoryContext | Consistent | Via guest-strategy |
| Services | RepositoryContext | Consistent | Via guest-strategy |
| API Routes | Creates context | N/A | N/A |

### Context Pattern Score: 9/10

**Strengths:**
- Consistent context structure
- Ownership checks in all write operations
- Guest-aware operations via separate strategy module

**Minor Issue:**
- Some repository methods ignore context parameter (marked with `_context`)

---

## Transaction Patterns

### Pattern Definition

Transactions for multi-step operations:

```typescript
await withTransaction(async (tx) => {
  // Step 1
  await tx.insert(chat).values(chatData)
  
  // Step 2
  await tx.insert(message).values(messages)
  
  // Step 3
  await tx.update(chat).set({ lastContext }).where(...)
  
  // Auto-rollback on error
})
```

### Consistency Analysis

| Operation | Uses Transaction | Correct Scope | Error Handling |
|-----------|-----------------|---------------|----------------|
| saveChat | Yes | Correct | Wrapped in withTransaction |
| deleteChat | Yes | Correct | Wrapped in withTransaction |
| batchUpdate | Yes (per chunk) | Correct | Per-chunk transactions |
| Single CRUD | No | N/A | N/A |

### Transaction Pattern Score: 9/10

**Strengths:**
- Consistent use of `withTransaction` helper
- Proper OpenTelemetry integration
- Automatic rollback on error

---

## Query Building Patterns

### Pattern Definition

Consistent approach to building queries:

```typescript
// Pattern 1: Simple conditions
const result = await db.select().from(table).where(eq(table.id, id))

// Pattern 2: Multiple conditions
const conditions: SQL[] = []
if (filter1) conditions.push(eq(table.field1, filter1))
if (filter2) conditions.push(eq(table.field2, filter2))
const whereClause = conditions.length > 0 ? and(...conditions) : undefined

// Pattern 3: Joins
const result = await db.select().from(tableA).innerJoin(tableB, eq(tableA.id, tableB.aId))
```

### Consistency Analysis

| Repository | Condition Building | Join Usage | Ordering |
|------------|------------------|------------|----------|
| ChatRepository | Consistent | None | desc(createdAt) |
| MessageRepository | Consistent | None | asc(createdAt) |
| ArtifactRepository | Consistent | None | desc(createdAt) |
| ChatQueries | Consistent | Yes | Varies |

### Query Pattern Score: 8/10

**Strengths:**
- Consistent condition building pattern
- Appropriate use of indexes

**Inconsistencies:**
- Some queries use `sql` template for complex operations
- Ordering direction varies (some use desc, some asc)

---

## Logging Patterns

### Pattern Definition

Consistent logging with context:

```typescript
logDebug("Operation description", { key: value })
logError("Operation failed", error, { context })
logWarn("Warning message", { context })
logInfo("Info message", { context })
```

### Consistency Analysis

| Layer | Debug Logging | Error Logging | Context Included |
|-------|--------------|---------------|-----------------|
| Repositories | Yes | Yes | Yes |
| Services | Yes | Yes | Yes |
| Queries | Yes | Yes | Yes |
| Client | Yes | Yes | Yes |

### Logging Pattern Score: 10/10

**Strengths:**
- Consistent logging format across all layers
- Appropriate log levels (debug for operations, error for failures)
- Context always included

---

## Summary Scores

| Pattern | Score | Primary Issue |
|---------|-------|---------------|
| Repository Pattern | 8/10 | VoteRepository interface mismatch |
| Service Layer | 7/10 | Thin wrappers, inconsistent DB access |
| Error Handling | 8/10 | Query layer throws raw errors |
| Caching | 9/10 | Minor inconsistency in list caching |
| Pagination | 6/10 | Two different interfaces/results |
| Context Propagation | 9/10 | Some methods ignore context |
| Transactions | 9/10 | Consistent usage |
| Query Building | 8/10 | Varies slightly between repos |
| Logging | 10/10 | Fully consistent |

**Overall Pattern Consistency Score: 8.2/10**

---

## Recommendations

### High Priority

1. **Standardize Pagination**
   - Consolidate `PaginationParams` and `CursorPaginationOptions`
   - Use single result type with optional cursor fields
   - Migrate ChatRepository to use `paginate()` utility

2. **Fix VoteRepository Interface**
   - Remove `findById` from interface implementation
   - Document that Vote uses composite primary key

### Medium Priority

3. **Improve Service Layer**
   - Add business logic to services or remove thin wrappers
   - Consistently use repositories instead of direct DB queries

4. **Wrap Query Errors**
   - Create `QueryError` type for query module failures
   - Ensure all errors include context

### Low Priority

5. **Document Context Usage**
   - Clarify which methods use context for ownership
   - Mark unused context parameters explicitly

---

## Pattern Compliance Checklist

For new data layer code, verify:

- [ ] Repository extends BaseRepository
- [ ] Implements IReadRepository and IWriteRepository
- [ ] Uses cache-through for reads
- [ ] Uses write-through for writes
- [ ] Invalidates list cache on writes
- [ ] Uses RepositoryContext for ownership checks
- [ ] Throws typed errors with context
- [ ] Logs operations at appropriate level
- [ ] Uses transactions for multi-step operations
- [ ] Uses standard pagination interfaces