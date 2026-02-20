# Scout Report - Shard 12: Cache Infrastructure

```
| Files in shard          | 13 |
| Total LOC               | 5,503 |
| Exports catalogued      | 136 |
| Cross-shard edges found | 14 |
| Issues flagged          | 8 |
| Critical complexity (>10)| 0 |
```

---

## File Inventory

### 1. `lib/cache/index.ts`
| Property | Value |
|----------|-------|
| Size | 285 LOC |
| Classification | Entry point (barrel export) |
| Cyclomatic Complexity | 1 |
| Public Exports | 136 re-exports from all modules |

**Exports:**
- From `client`: `checkRedisHealth`, `getRedisClient`, `isRedisAvailable`, `Redis`, `requireRedisClient`
- From `circuit-breaker`: `CIRCUIT_BREAKER_RESET_MS`, `CIRCUIT_BREAKER_THRESHOLD`, `getCircuitBreakerState`, `isCircuitOpen`, `recordCacheFailure`, `recordCacheSuccess`, `resetCircuitBreaker`
- From `keys`: `artifactKey`, `CACHE_KEY_PREFIX`, `CacheKeys`, `CacheKeysType`, `chatKey`, `chatKeysPattern`, `chatListKey`, `chatMessagesKey`, `chatMessagesPattern`, `chatMetaKey`, `messageKey`, `userChatsKey`, `userKey`, `userKeysPattern`
- From `strategies`: `CacheOptions`, `CacheResult`, `cacheAside`, `cacheThrough`, `Fetcher`, `getCacheMetrics`, `getOrSet`, `invalidate`, `invalidatePattern`, `Persister`, `refresh`, `resetCacheMetrics`, `writeBehind`, `writeThrough`
- From `invalidation`: `clearAllCache`, `countKeysByPattern`, `getKeysByPattern`, `InvalidationOptions`, `InvalidationResult`, `invalidateArtifact`, `invalidateByPattern`, `invalidateChat`, `invalidateChats`, `invalidateGuest`, `invalidateMessage`, `invalidateMessages`, `invalidateUser`
- From `quota`: `checkAndIncrementMessageQuota`, `checkAndIncrementQuota`, `checkMessageQuota`, `checkQuota`, `DEFAULT_MESSAGE_QUOTA`, `DEFAULT_WINDOW_SECONDS`, `getCacheKeyCount`, `getQuotaInfo`, `getTotalTrackedSize`, `incrementMessageQuota`, `incrementQuota`, `QuotaCheckResult`, `QuotaInfo`, `QuotaOptions`, `resetQuota`, `trackKeySize`
- From `memory-cache`: `createLRUCache`, `defaultLRUCache`, `LRUCache`, `LRUCacheOptions`, `LRUCacheStats`, `SetOptions`
- From `tiered-cache`: `createCacheWarmer`, `createTieredCache`, `defaultTieredCache`, `TieredCache`, `TieredCacheOptions`, `TieredCacheResult`, `TieredCacheSetOptions`, `TieredCacheStats`, `WarmFetcher`, `warmCache`, `warmCacheWithEntries`
- From `types`: `ArtifactKind`, `ArtifactPart`, `attachmentToFilePart`, `CachedChat`, `CachedChatMeta`, `CachedDocument`, `CachedMessage`, `CodePart`, `DocumentVersion`, `extractFileUrlsFromParts`, `extractTextFromParts`, `FilePart`, `filePartToAttachment`, `getFileName`, `getMediaType`, `hasReasoning`, `hasToolCalls`, `ImagePart`, `isArtifactPart`, `isCachedChatMeta`, `isCachedMessage`, `isFilePart`, `isMessagePart`, `isReasoningPart`, `isTextPart`, `isToolCallPart`, `isToolResultPart`, `isUserChatListItem`, `MessageAttachment`, `MessagePart`, `ModelPart`, `parseMessageParts`, `ReasoningPart`, `SourcePart`, `StepPart`, `TextPart`, `ToolCallPart`, `ToolResultPart`, `UnknownPart`, `UserChatListItem`, `VisibilityType`
- From `zset`: `addToChatList`, `getChatList`, `removeFromChatList`, `ZAddOptions`, `ZMember`, `zadd`, `zaddOne`, `zcard`, `zgetNewest`, `zgetOldest`, `zrange`, `zrem`, `zremrangebyscore`, `zrevrange`, `zrevrangeWithScores`, `zscore`
- From `cast`: `CastError`, `CastResult`, `cacheStringToDate`, `cacheStringToTimestamp`, `castToAppUsage`, `castToAppUsageOrNull`, `castToCachedChat`, `castToCachedChatMeta`, `castToCachedMessage`, `castToCachedMessages`, `castToUserChatListItem`, `castToUserChatListItems`, `dateToCacheString`, `parseAndCast`, `safeDeserialize`, `safeSerialize`, `timestampToCacheString`

---

### 2. `lib/cache/types.ts`
| Property | Value |
|----------|-------|
| Size | 322 LOC |
| Classification | Type definitions |
| Cyclomatic Complexity | 6 (type guards have branching) |
| Public Exports | 42 |

**Exports:**
- **Re-exports:** `ArtifactKind`, `ArtifactPart`, `attachmentToFilePart`, `CodePart`, `extractFileUrlsFromParts`, `extractTextFromParts`, `FilePart`, `filePartToAttachment`, `getFileName`, `getMediaType`, `hasArtifacts`, `hasCode`, `hasImages`, `hasReasoning`, `hasSources`, `hasToolCalls`, `ImagePart`, `isArtifactPart`, `isCodePart`, `isFilePart`, `isImagePart`, `isMessagePart`, `isModelPart`, `isReasoningPart`, `isSourcePart`, `isStepPart`, `isTextPart`, `isToolCallPart`, `isToolResultPart`, `MessageAttachment`, `MessagePart`, `ModelPart`, `parseMessageParts`, `ReasoningPart`, `SourcePart`, `StepPart`, `TextPart`, `ToolCallPart`, `ToolResultPart`, `UnknownPart`, `VisibilityType`
- **Local types:** `CachedChatMeta`, `CachedChat`, `CachedMessage`, `UserChatListItem`, `CachedDocument`, `DocumentVersion`
- **Type guards:** `isCachedChatMeta()`, `isCachedMessage()`, `isUserChatListItem()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/features/artifact/types` | `ArtifactKind` | External (cross-shard) |
| `@/features/chat/components` | `VisibilityType` | External (cross-shard) |
| `@/features/chat/types` | `AppUsage` | External (cross-shard) |
| `@/lib/types/message-parts` | 24 types + functions | External (cross-shard) |

---

### 3. `lib/cache/cast.ts`
| Property | Value |
|----------|-------|
| Size | 531 LOC |
| Classification | Utility (type-safe casting) |
| Cyclomatic Complexity | 8 |
| Public Exports | 18 |

**Exports:**
- **Types:** `CastResult<T>`, `CastError`
- **Cast functions:** `castToAppUsage()`, `castToAppUsageOrNull()`, `castToCachedChatMeta()`, `castToCachedMessage()`, `castToCachedMessages()`, `castToCachedChat()`, `castToUserChatListItem()`, `castToUserChatListItems()`
- **JSON utilities:** `parseAndCast()`, `safeSerialize()`, `safeDeserialize()`
- **Date utilities:** `dateToCacheString()`, `cacheStringToDate()`, `timestampToCacheString()`, `cacheStringToTimestamp()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/ai` | `AppUsage` | External (cross-shard) |
| `./types` | `CachedChat`, `CachedChatMeta`, `CachedMessage`, `UserChatListItem`, `isCachedChatMeta`, `isCachedMessage`, `isUserChatListItem` | Internal |

---

### 4. `lib/cache/client.ts`
| Property | Value |
|----------|-------|
| Size | 206 LOC |
| Classification | Infrastructure (Redis client) |
| Cyclomatic Complexity | 4 |
| Public Exports | 5 |

**Exports:**
- `getRedisClient()`, `isRedisAvailable()`, `checkRedisHealth()`, `requireRedisClient()`, `Redis` (type re-export)

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@upstash/redis` | `Redis` | External (npm) |
| `@/lib/log` | `logDebug`, `logError`, `logInfo`, `logWarn` | External (cross-shard) |

---

### 5. `lib/cache/circuit-breaker.ts`
| Property | Value |
|----------|-------|
| Size | 168 LOC |
| Classification | Infrastructure (resilience pattern) |
| Cyclomatic Complexity | 4 |
| Public Exports | 8 |

**Exports:**
- **Constants:** `CIRCUIT_BREAKER_THRESHOLD`, `CIRCUIT_BREAKER_RESET_MS`
- **Functions:** `isCircuitOpen()`, `recordCacheFailure()`, `recordCacheSuccess()`, `getCircuitBreakerState()`, `resetCircuitBreaker()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/log` | `logError`, `logWarn` | External (cross-shard) |

---

### 6. `lib/cache/keys.ts`
| Property | Value |
|----------|-------|
| Size | 277 LOC |
| Classification | Utility (key generation) |
| Cyclomatic Complexity | 1 |
| Public Exports | 15 |

**Exports:**
- **Constant:** `CACHE_KEY_PREFIX`
- **Entity key functions:** `chatKey()`, `chatListKey()`, `messageKey()`, `userKey()`, `artifactKey()`
- **Composite key functions:** `chatMetaKey()`, `chatMessagesKey()`, `userChatsKey()`
- **Pattern functions:** `chatMessagesPattern()`, `userKeysPattern()`, `chatKeysPattern()`
- **Object:** `CacheKeys`, `CacheKeysType`

**Imports:** None

---

### 7. `lib/cache/memory-cache.ts`
| Property | Value |
|----------|-------|
| Size | 410 LOC |
| Classification | Domain logic (L1 cache) |
| Cyclomatic Complexity | 6 |
| Public Exports | 9 |

**Exports:**
- **Types:** `LRUCacheStats`, `LRUCacheOptions`, `SetOptions`
- **Class:** `LRUCache<T>`
- **Factory:** `createLRUCache()`
- **Instance:** `defaultLRUCache`

**Imports:** None (self-contained)

---

### 8. `lib/cache/tiered-cache.ts`
| Property | Value |
|----------|-------|
| Size | 599 LOC |
| Classification | Domain logic (L1+L2 cache) |
| Cyclomatic Complexity | 8 |
| Public Exports | 12 |

**Exports:**
- **Types:** `TieredCacheOptions`, `TieredCacheStats`, `TieredCacheSetOptions`, `TieredCacheResult<T>`, `WarmFetcher<T>`
- **Class:** `TieredCache<T>`
- **Factory:** `createTieredCache()`
- **Instance:** `defaultTieredCache`
- **Warming functions:** `warmCache()`, `warmCacheWithEntries()`, `createCacheWarmer()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/constants` | `CACHE_TTL` | External (cross-shard) |
| `@/lib/log` | `logDebug`, `logError`, `logWarn` | External (cross-shard) |
| `./circuit-breaker` | `isCircuitOpen`, `recordCacheFailure`, `recordCacheSuccess` | Internal |
| `./client` | `getRedisClient`, `isRedisAvailable` | Internal |
| `./memory-cache` | `LRUCache`, `LRUCacheOptions`, `LRUCacheStats` | Internal |

---

### 9. `lib/cache/zset.ts`
| Property | Value |
|----------|-------|
| Size | 600 LOC |
| Classification | Domain logic (sorted set ops) |
| Cyclomatic Complexity | 6 |
| Public Exports | 16 |

**Exports:**
- **Types:** `ZAddOptions`, `ZMember<T>`
- **Core operations:** `zadd()`, `zrem()`, `zrange()`, `zrevrange()`, `zcard()`, `zremrangebyscore()`, `zrevrangeWithScores()`, `zscore()`
- **Convenience:** `zaddOne()`, `zgetNewest()`, `zgetOldest()`
- **Chat list APIs:** `addToChatList()`, `removeFromChatList()`, `getChatList()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/log` | `logDebug`, `logError` | External (cross-shard) |
| `./circuit-breaker` | `isCircuitOpen`, `recordCacheFailure`, `recordCacheSuccess` | Internal |
| `./client` | `getRedisClient` | Internal |
| `./keys` | `userChatsKey` | Internal |
| `./types` | `UserChatListItem` | Internal |

---

### 10. `lib/cache/quota.ts`
| Property | Value |
|----------|-------|
| Size | 561 LOC |
| Classification | Domain logic (quota management) |
| Cyclomatic Complexity | 7 |
| Public Exports | 18 |

**Exports:**
- **Types:** `QuotaInfo`, `QuotaOptions`, `QuotaCheckResult`
- **Constants:** `DEFAULT_MESSAGE_QUOTA`, `DEFAULT_WINDOW_SECONDS`
- **Core operations:** `checkQuota()`, `incrementQuota()`, `checkAndIncrementQuota()`, `resetQuota()`, `getQuotaInfo()`
- **Message quota helpers:** `checkMessageQuota()`, `incrementMessageQuota()`, `checkAndIncrementMessageQuota()`
- **Cache size tracking:** `getCacheKeyCount()`, `trackKeySize()`, `getTotalTrackedSize()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/log` | `logDebug`, `logError`, `logWarn` | External (cross-shard) |
| `./client` | `getRedisClient` | Internal |

---

### 11. `lib/cache/strategies.ts`
| Property | Value |
|----------|-------|
| Size | 549 LOC |
| Classification | Domain logic (cache patterns) |
| Cyclomatic Complexity | 7 |
| Public Exports | 14 |

**Exports:**
- **Types:** `CacheOptions`, `CacheResult<T>`, `Fetcher<T>`, `Persister<T>`
- **Strategies:** `cacheThrough()`, `cacheAside()`, `writeThrough()`, `writeBehind()`
- **Operations:** `invalidate()`, `invalidatePattern()`, `refresh()`, `getOrSet()`
- **Metrics:** `getCacheMetrics()`, `resetCacheMetrics()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/constants` | `CACHE_TTL` | External (cross-shard) |
| `@/lib/log` | `logDebug`, `logError`, `logWarn` | External (cross-shard) |
| `./circuit-breaker` | `isCircuitOpen`, `recordCacheFailure`, `recordCacheSuccess` | Internal |
| `./client` | `getRedisClient`, `isRedisAvailable` | Internal |

---

### 12. `lib/cache/invalidation.ts`
| Property | Value |
|----------|-------|
| Size | 650 LOC |
| Classification | Domain logic (cache invalidation) |
| Cyclomatic Complexity | 7 |
| Public Exports | 14 |

**Exports:**
- **Types:** `InvalidationResult`, `InvalidationOptions`
- **Entity invalidation:** `invalidateChat()`, `invalidateUser()`, `invalidateMessage()`, `invalidateArtifact()`
- **Batch invalidation:** `invalidateChats()`, `invalidateMessages()`
- **Pattern-based:** `invalidateByPattern()`, `invalidateGuest()`
- **Utilities:** `getKeysByPattern()`, `countKeysByPattern()`, `clearAllCache()`

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `@/lib/log` | `logDebug`, `logError`, `logInfo` | External (cross-shard) |
| `./client` | `getRedisClient` | Internal |
| `./keys` | `artifactKey`, `chatKey`, `chatKeysPattern`, `chatMessagesKey`, `chatMessagesPattern`, `chatMetaKey`, `messageKey`, `userChatsKey`, `userKey`, `userKeysPattern` | Internal |

---

### 13. `lib/cache/index.test.ts`
| Property | Value |
|----------|-------|
| Size | 613 LOC |
| Classification | Test |
| Cyclomatic Complexity | N/A |
| Public Exports | None (test file) |

**Imports:**
| Source | Imports | Type |
|--------|---------|------|
| `vitest` | Test utilities | External (npm) |
| `./index` | Multiple exports for testing | Internal |

---

## Cross-Shard Dependency Edges

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `types.ts` | `@/features/artifact/types` | `ArtifactKind` |
| `types.ts` | `@/features/chat/components` | `VisibilityType` |
| `types.ts` | `@/features/chat/types` | `AppUsage` |
| `types.ts` | `@/lib/types/message-parts` | 24 types/functions |
| `cast.ts` | `@/lib/ai` | `AppUsage` |
| `client.ts` | `@/lib/log` | `logDebug`, `logError`, `logInfo`, `logWarn` |
| `circuit-breaker.ts` | `@/lib/log` | `logError`, `logWarn` |
| `tiered-cache.ts` | `@/lib/constants` | `CACHE_TTL` |
| `tiered-cache.ts` | `@/lib/log` | `logDebug`, `logError`, `logWarn` |
| `zset.ts` | `@/lib/log` | `logDebug`, `logError` |
| `quota.ts` | `@/lib/log` | `logDebug`, `logError`, `logWarn` |
| `strategies.ts` | `@/lib/constants` | `CACHE_TTL` |
| `strategies.ts` | `@/lib/log` | `logDebug`, `logError`, `logWarn` |
| `invalidation.ts` | `@/lib/log` | `logDebug`, `logError`, `logInfo` |

---

## Intra-Shard Pattern Flags

### 1. ⚠️ Near-Duplicate Error Handling Pattern
**Files:** `zset.ts`, `strategies.ts`, `tiered-cache.ts`, `quota.ts`, `invalidation.ts`
**Lines:** Multiple locations in each file
**Issue:** Consistent but duplicated error handling pattern with circuit breaker checks:

```typescript
// Pattern repeated in 5+ files
if (isCircuitOpen()) {
  return <default_value>;
}
const redis = getRedisClient();
if (!redis) {
  return <default_value>;
}
try {
  // operation
  recordCacheSuccess();
  return <result>;
} catch (error) {
  recordCacheFailure("operation", error);
  return <default_value>;
}
```

**Recommendation:** Extract to a reusable wrapper/HOF.

---

### 2. ⚠️ Re-Export Chain in types.ts
**File:** `types.ts:15-76`
**Issue:** `types.ts` re-exports 26 items from `@/lib/types/message-parts` and `@/features/*` modules. This creates an indirection layer that:
- Masks true source of types
- Creates unnecessary coupling between cache and feature modules
- Violates single responsibility

**Recommendation:** Consumers should import directly from source modules.

---

### 3. ⚠️ Duplicated Quota Result Object Construction
**File:** `quota.ts`
**Lines:** 129-136, 170-178, 214-216, 240-247, 257-260
**Issue:** Same `QuotaInfo` object construction pattern repeated 5 times:

```typescript
{
  used: <value>,
  limit: options.limit,
  remaining: <value>,
  exceeded: <value>,
  resetsAt: <value>,
}
```

**Recommendation:** Extract to a `buildQuotaInfo()` helper.

---

### 4. ⚠️ Duplicated InvalidationResult Object Construction
**File:** `invalidation.ts`
**Lines:** 180-184, 249-253, 310-314, 377-381, 439-443, 481-485, 554-558
**Issue:** Same `InvalidationResult` object construction pattern repeated 7 times:

```typescript
const result: InvalidationResult = {
  keysInvalidated: 0,
  success: true,
  errors: [],
};
```

**Recommendation:** Extract to a `createInvalidationResult()` factory.

---

### 5. ⚠️ Duplicate SCAN Pattern Implementation
**File:** `invalidation.ts`
**Lines:** 88-118 (scanAndDelete), 126-152 (scanKeys), and `strategies.ts:469-494` (invalidatePattern)
**Issue:** Nearly identical SCAN + loop patterns:
- `scanAndDelete()` in invalidation.ts
- `scanKeys()` in invalidation.ts
- `invalidatePattern()` in strategies.ts
- `getTotalTrackedSize()` in quota.ts

**Recommendation:** Consolidate to single `scanWithHandler()` utility.

---

### 6. Naming Inconsistency: Key Builders
**File:** `keys.ts`
**Issue:** Mixed naming conventions for similar functions:
- `chatKey()` - single entity key
- `chatListKey()` - list key
- `chatMessagesKey()` - composite key
- `chatMessagesPattern()` - pattern key

**Recommendation:** Standardize suffix convention: `*Key` for exact keys, `*Pattern` for patterns.

---

### 7. ⚠️ Type Guard Duplication
**Files:** `types.ts:278-321` and `cast.ts:63-110`
**Issue:** `isValidAppUsage()` in cast.ts validates similar fields to `isCachedChatMeta()` and others in types.ts. Both perform type checking with similar patterns.

**Recommendation:** Consider Zod schemas for consistent validation.

---

### 8. Potential Dead Code: parseChatListMember
**File:** `zset.ts:498-527`
**Issue:** `parseChatListMember()` is a private function with fallback logic that handles both JSON and non-JSON strings. The fallback path (treating raw string as chatId) may never be exercised if callers always pass valid JSON.

**Recommendation:** Verify test coverage for fallback path or remove if unused.

---

## Summary

### Well-Structured Aspects:
- Clear separation of concerns (client, keys, strategies, invalidation)
- Consistent circuit breaker integration across all Redis operations
- Good use of TypeScript discriminated unions (`CastResult<T>`)
- Comprehensive test coverage for LRU cache

### Areas for Improvement:
1. **DRY Violations:** Error handling pattern duplicated 15+ times
2. **Type Re-export Anti-pattern:** `types.ts` re-exports from 4 other modules
3. **Object Construction:** QuotaInfo and InvalidationResult built inline 12 times
4. **SCAN Pattern:** 4 implementations of same scan-loop pattern

### No Critical Complexity Issues:
All files have cyclomatic complexity ≤ 8, well below the threshold of 10.

---

## ⚠️ ESCALATION Items

1. **Cross-shard type coupling:** `types.ts` imports from `@/features/*` - this creates bidirectional dependency risk between cache layer and feature modules. Consider whether cache types should be defined in cache module or imported directly by consumers.

2. **AppUsage import ambiguity:** `cast.ts` imports `AppUsage` from `@/lib/ai` while `types.ts` imports from `@/features/chat/types`. Verify these are the same type or if there's a conflict.