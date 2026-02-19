# Data Layer Simplification Opportunities

## Overview

This document identifies opportunities to simplify the data layer code, including duplicate patterns, over-engineered abstractions, and potential consolidations.

---

## 1. Duplicate Query Patterns

### Issue: Repeated Condition Building

Multiple repositories use identical patterns for building WHERE conditions:

**Current Code (Repeated in Multiple Repositories):**

```typescript
// lib/data/repositories/chat.repository.ts:189
const conditions: SQL<unknown>[] = []

if (options?.where?.userId) {
  conditions.push(eq(chat.userId, options.where.userId as string))
} else if (context?.userId) {
  conditions.push(eq(chat.userId, context.userId))
}

if (options?.where?.visibility) {
  conditions.push(eq(chat.visibility, options.where.visibility as "public" | "private"))
}

const whereClause = conditions.length > 0 ? and(...conditions) : undefined
```

**Similar code in:**
- [`chat.repository.ts:189-210`](lib/data/repositories/chat.repository.ts:189)
- [`message.repository.ts:189-210`](lib/data/repositories/message.repository.ts:189)
- [`artifact.repository.ts:213-233`](lib/data/repositories/artifact.repository.ts:213)
- [`vote.repository.ts`](lib/data/repositories/vote.repository.ts)

**Recommendation:** Extract to a shared utility:

```typescript
// lib/data/utils/condition-builder.ts
export function buildConditions<T extends Record<string, unknown>>(
  table: T,
  options: FindManyOptions,
  context?: RepositoryContext
): SQL | undefined {
  const conditions: SQL[] = []
  
  // Standard user filter
  const userId = options.where?.userId ?? context?.userId
  if (userId && 'userId' in table) {
    conditions.push(eq(table.userId, userId))
  }
  
  // Additional filters from options.where
  for (const [key, value] of Object.entries(options.where ?? {})) {
    if (key !== 'userId' && key in table) {
      conditions.push(eq(table[key], value))
    }
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined
}
```

**Impact:** Reduces ~50 lines of duplicate code across repositories.

---

## 2. Over-Engineered Base Repository

### Issue: Abstract Methods Rarely Used

The [`BaseRepository`](lib/data/repositories/base.repository.ts:211) defines many abstract methods that are implemented nearly identically across repositories:

**Current Abstract Methods:**
- `cacheKey(id)` - Simple string template
- `cacheListKey()` - Simple string constant
- `ttl` - Simple constant
- `listTtl` - Simple constant
- `doFindById()` - Similar pattern
- `doFindMany()` - Similar pattern
- `doCount()` - Similar pattern
- `doCreate()` - Similar pattern
- `doUpdate()` - Similar pattern
- `doDelete()` - Similar pattern

**Recommendation:** Use configuration-based approach:

```typescript
// Simplified BaseRepository with configuration
interface RepositoryConfig<T extends Identifiable, TCreate> {
  tableName: string
  cachePrefix: string
  ttl: number
  listTtl: number
  // Optional overrides for custom behavior
  customFindById?: (id: string, context?: RepositoryContext) => Promise<T | null>
}

class BaseRepository<T extends Identifiable, TCreate> {
  constructor(protected config: RepositoryConfig<T, TCreate>) {}
  
  protected cacheKey(id: string): string {
    return `${this.config.cachePrefix}:${id}`
  }
  
  // Default implementations that can be overridden
  protected async doFindById(id: string, context?: RepositoryContext): Promise<T | null> {
    if (this.config.customFindById) {
      return this.config.customFindById(id, context)
    }
    // Default implementation
  }
}
```

**Impact:** Reduces boilerplate in each repository from ~100 lines to ~30 lines.

---

## 3. Redundant Count Implementation

### Issue: Count Uses Select Instead of SQL Count

Current count implementation fetches all IDs and counts in memory:

```typescript
// lib/data/repositories/chat.repository.ts:270
const result = await this.db
  .select({ count: chat.id })
  .from(chat)
  .where(whereClause)

return result.length  // Inefficient!
```

**Recommendation:** Use proper SQL COUNT:

```typescript
import { count } from 'drizzle-orm'

const [result] = await this.db
  .select({ count: count() })
  .from(chat)
  .where(whereClause)

return result?.count ?? 0
```

**Impact:** Significant performance improvement for large datasets.

---

## 4. Duplicate Pagination Logic

### Issue: Pagination Implemented Multiple Times

Cursor-based pagination logic is duplicated:

- [`chat.repository.ts:418-509`](lib/data/repositories/chat.repository.ts:418) - `findByUserId`
- [`pagination.ts:215-332`](lib/db/pagination.ts:215) - `paginate` function

**Current State:** ChatRepository implements its own pagination instead of using the generic `paginate()` utility.

**Recommendation:** Consolidate to use the generic pagination utility:

```typescript
// In ChatRepository
async findByUserId(
  userId: string,
  pagination: PaginationParams,
  context?: RepositoryContext
): Promise<PaginatedResult<Chat>> {
  const query = this.db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .$dynamic()
  
  return paginate(query, chat, toCursorOptions(pagination))
}
```

**Impact:** Removes ~90 lines of duplicate pagination logic.

---

## 5. Service Layer Redundancy

### Issue: Service Methods That Just Delegate

Several service methods are thin wrappers around repository calls:

```typescript
// lib/data/services/chat.service.ts:170
async getHistory(
  pagination: PaginationParams,
  ctx: RepositoryContext,
): Promise<PaginatedResult<Chat>> {
  return await chatRepository.findByUserId(ctx.userId, pagination, ctx)
}
```

**Similar patterns:**
- `getChatById` -> `chatRepository.findById`
- `getHistory` -> `chatRepository.findByUserId`
- `createChat` -> `chatRepository.create`

**Recommendation:** Either:
1. Remove these service methods and use repositories directly
2. Add actual business logic to services (validation, events, etc.)

**Impact:** Reduces unnecessary abstraction layer.

---

## 6. Unused Repository Methods

### Issue: Methods Defined But Never Called

Analysis suggests some repository methods may not be used:

| Repository | Method | Likely Unused |
|------------|--------|---------------|
| `VoteRepository` | `doFindById` | Throws error (composite PK) |
| `BaseRepository` | `createMany` | Sequential creates (inefficient) |
| `BaseRepository` | `deleteMany` | Sequential deletes (inefficient) |

**Recommendation:** 
1. Remove `doFindById` from VoteRepository (not applicable for composite PK)
2. Replace `createMany`/`deleteMany` with batch operations from `lib/db/batch.ts`

**Impact:** Removes confusing dead code.

---

## 7. Type Duplication

### Issue: Same Types Defined Multiple Times

```typescript
// lib/data/repositories/chat.repository.ts:74
export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
}

// lib/data/types.ts:96
export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
}

// lib/db/pagination.ts:56
export interface CursorPaginatedResult<T> {
  data: T[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount?: number
}
```

**Recommendation:** Consolidate to single source of truth:

```typescript
// lib/data/types.ts - Single definition
export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
  nextCursor?: string | null
  prevCursor?: string | null
  totalCount?: number
}
```

**Impact:** Reduces type confusion and maintenance burden.

---

## 8. Over-Complex Guest Strategy

### Issue: Guest Strategy Could Be Simpler

The [`guest-strategy.ts`](lib/data/guest-strategy.ts) has multiple functions for similar operations:

```typescript
// Current: 4 separate functions
guestAwareGet()
guestCacheOnly()
authUserGet()
guestAwareWrite()
guestCacheWrite()
authUserWrite()
```

**Recommendation:** Simplify to single functions with branching:

```typescript
export async function guestAwareGet<T>(
  key: string,
  fetcher: DbFetcher<T>,
  context: RepositoryContext,
  options?: GuestCacheOptions
): Promise<GuestDataResult<T>> {
  const ttl = context.isGuest 
    ? (options?.ttl ?? CACHE_TTL.guest)
    : (options?.ttl ?? CACHE_TTL.default)
  
  const result = await cacheAside<T | null>(
    key,
    context.isGuest ? () => Promise.resolve(null) : fetcher,
    { ...options, ttl }
  )
  
  return {
    value: result.value,
    fromCache: result.fromCache,
    isGuest: context.isGuest
  }
}
```

**Impact:** Reduces from ~300 lines to ~100 lines.

---

## 9. Batch Operations Not Used in Repositories

### Issue: Repositories Don't Use Batch Utilities

The [`batch.ts`](lib/db/batch.ts) module provides efficient batch operations, but repositories use sequential operations:

```typescript
// lib/data/repositories/base.repository.ts:517
async createMany(data: TCreate[], context?: RepositoryContext): Promise<T[]> {
  const results: T[] = []
  for (const item of data) {
    const result = await this.doCreate(item, context)  // Sequential!
    results.push(result)
  }
  return results
}
```

**Recommendation:** Use batch utilities:

```typescript
async createMany(data: TCreate[], context?: RepositoryContext): Promise<T[]> {
  return batchInsert(this.table, data, { chunkSize: 100 })
}
```

**Impact:** Significant performance improvement for bulk operations.

---

## 10. Query Module Redundancy

### Issue: ChatService and ChatQueries Overlap

Both provide similar functionality:

| ChatService Method | ChatQueries Function |
|-------------------|----------------------|
| `getWithMessages` | `getChatWithMessagesAndArtifacts` |
| `getHistory` | `getChatsWithMessageCount` |

**Recommendation:** Consolidate:
- Keep queries for complex operations (joins, aggregations)
- Keep services for transactional operations
- Remove overlapping methods

---

## Summary Table

| Issue | Severity | Lines Saved | Performance Impact |
|-------|----------|-------------|-------------------|
| Duplicate condition building | Medium | ~50 | Low |
| Over-engineered base repository | High | ~200 | Low |
| Inefficient count | High | 0 | **High** |
| Duplicate pagination | Medium | ~90 | Medium |
| Thin service methods | Low | ~50 | Low |
| Unused repository methods | Low | ~30 | Low |
| Type duplication | Low | ~20 | Low |
| Complex guest strategy | Medium | ~200 | Low |
| Sequential batch operations | High | 0 | **High** |
| Query/service overlap | Medium | ~50 | Low |

**Total Potential Reduction:** ~700 lines of code

---

## Recommended Priority

1. **High Priority (Performance):**
   - Fix count implementation
   - Use batch operations in repositories

2. **Medium Priority (Maintainability):**
   - Consolidate pagination logic
   - Simplify guest strategy
   - Extract condition builder utility

3. **Low Priority (Code Cleanliness):**
   - Remove unused methods
   - Consolidate types
   - Simplify base repository