# Upstash Redis Caching Layer Implementation

## Overview

This document describes the Upstash Redis caching layer implementation for the Next.js AI Chatbot. The architecture is optimized for **low latency**, **minimal database calls**, and deployment on **Vercel Fluid Compute** with edge-optimized Redis access.

## Architecture

### Core Principles

1. **Cache-First Reads**: Always check Redis before querying PostgreSQL
2. **Parallel Writes**: Write to both Redis and PostgreSQL simultaneously (except for guests)
3. **Denormalized Structure**: Store complete chat objects with messages for single-request retrieval
4. **Guest User Optimization**: Cache-only storage for guest sessions (no PostgreSQL writes)
5. **No Resumable Streams**: Removed in favor of simpler, more reliable streaming

## Cache Structure

### 1. Chat Cache (`chat:{chatId}:{userId}`)

**Data Structure**: RedisJSON  
**Purpose**: Full denormalized chat view with messages  
**TTL**: None for regular users; optional for guests

```typescript
{
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
  lastContext: AppUsage | null;
  messages: [{
    id: string;
    chatId: string;
    role: "user" | "assistant" | "system";
    parts: any; // JSON parts
    attachments: any[];
    createdAt: string; // ISO format
  }];
  version: number; // Optimistic locking
}
```

**Benefits**:
- Single Redis call retrieves complete chat with all messages
- Messages stored in chronological order
- New messages appended efficiently
- Avoids N+1 query problems

### 2. User Chat List (`user:{userId}:chats`)

**Data Structure**: ZSET (Sorted Set)  
**Purpose**: Ordered list of chat IDs for sidebar  
**Score**: Unix timestamp in milliseconds (updatedAt)  
**Member**: JSON string with `{chatId, title}`

```typescript
// ZSET members sorted by updatedAt (descending)
{
  score: Date.parse(chat.updatedAt), // Numeric timestamp
  member: JSON.stringify({ chatId: "...", title: "..." })
}
```

**Benefits**:
- Fast pagination with `ZRANGE` 
- Automatic sorting by most recent
- Efficient sidebar rendering

### 3. Document Cache (`document:{documentId}:{userId}`)

**Data Structure**: RedisJSON  
**Purpose**: Document with all version history

```typescript
{
  id: string;
  userId: string;
  chatId: string;
  versions: [{
    title: string;
    content: string | null;
    kind: "text" | "code" | "image" | "sheet";
    createdAt: string; // ISO format
    updatedAt: string; // ISO format
  }]
}
```

**Benefits**:
- All document versions in single key
- Append-only version history
- Single request for complete document timeline

## Implementation Details

### File Structure

```
lib/
├── cache/
│   ├── redis.ts              # Upstash Redis client initialization
│   ├── types.ts              # Cache type definitions
│   ├── operations.ts         # Core cache operations
│   └── guest-queries.ts      # Guest-specific cache-only queries
```

### Read Flow (Cache-First)

```typescript
// Example: getChatById
1. Check Redis: getChatFromCache(chatId, userId)
2. If HIT → Return cached data
3. If MISS → Fetch from PostgreSQL
4. Warm cache in background (non-blocking)
5. Return data to user
```

**Implementation in `lib/db/queries.ts`**:
```typescript
export async function getChatById({ id, userId }: { id: string; userId?: string }) {
  // Try cache first if userId provided
  if (userId && isRedisAvailable()) {
    const cached = await getChatFromCache(id, userId);
    if (cached) {
      return mapCachedToChat(cached);
    }
  }

  // Cache miss - fetch from database
  const chat = await db.select()...;
  
  // Warm cache in background
  if (userId && chat) {
    warmChatCache(...).catch(console.error);
  }
  
  return chat;
}
```

### Write Flow (Parallel)

```typescript
// Example: saveMessages
1. Prepare DB write promise
2. Prepare cache update promise
3. Execute Promise.all([dbWrite, cacheWrite])
4. Return to user immediately
```

**Benefits**:
- User experiences minimal latency
- Cache always up-to-date
- No sequential bottlenecks

### Guest User Flow (Cache-Only)

```typescript
// For guest users (userType === "guest"):
1. All reads from Redis only
2. All writes to Redis only
3. No PostgreSQL interaction
4. Optional TTL for automatic cleanup
```

**Implementation**:
```typescript
if (isGuest) {
  await saveGuestMessages({ messages, userId });
} else {
  await saveMessages({ messages });
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Upstash Redis (REST API)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# PostgreSQL (existing)
POSTGRES_URL=postgres://...
```

### Obtaining Upstash Credentials

**Option 1: Upstash Console**
1. Visit [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy REST URL and Token

**Option 2: Vercel Integration**
1. Go to Vercel project settings
2. Add Upstash integration
3. Environment variables added automatically

## Performance Optimizations

### 1. Single Request Chat Loading
- **Before**: 2 queries (chat metadata + messages)
- **After**: 1 Redis GET (denormalized structure)
- **Improvement**: ~50% reduction in round trips

### 2. Parallel Writes
- **Before**: Sequential DB writes
- **After**: Parallel Redis + PostgreSQL
- **Improvement**: User sees response immediately

### 3. Guest User Optimization
- **Before**: All users write to PostgreSQL
- **After**: Guests use cache-only
- **Improvement**: Reduced database load, faster guest experience

### 4. Removed Resumable Streams
- **Before**: Complex Redis-backed stream resumption
- **After**: Simple message replay from cache
- **Improvement**: Simplified architecture, reduced failure points

## Deployment

### Vercel Fluid Compute Optimization

The architecture is specifically designed for Vercel's serverless environment:

1. **REST API**: Upstash uses HTTP REST (no persistent connections)
2. **Edge-Compatible**: Works with Edge Runtime
3. **Auto-Scaling**: Redis scales with serverless invocations
4. **Low Latency**: Global edge network for Redis

### Configuration

1. Add environment variables to Vercel project
2. Deploy as normal: `vercel deploy`
3. Redis client initializes automatically

## Migration Guide

### Existing Data

No migration required! The cache warms automatically:

1. First request → Cache miss
2. Fetch from PostgreSQL
3. Populate Redis
4. Subsequent requests → Cache hit

### Gradual Rollout

The implementation is backward-compatible:

- If Redis unavailable → Falls back to PostgreSQL
- Graceful degradation
- No breaking changes

## Monitoring

### Cache Hit Rate

Track cache effectiveness:

```typescript
// Add metrics in operations.ts
let cacheHits = 0;
let cacheMisses = 0;

export function getCacheStats() {
  return {
    hitRate: cacheHits / (cacheHits + cacheMisses),
    hits: cacheHits,
    misses: cacheMisses
  };
}
```

### Recommended Metrics

1. **Cache Hit Rate**: Target >90% for active users
2. **Response Latency**: Should be <50ms for cache hits
3. **Redis Memory Usage**: Monitor with Upstash dashboard
4. **PostgreSQL Load**: Should decrease significantly

## Troubleshooting

### Redis Not Available

**Symptom**: Console warning "Upstash Redis not configured"  
**Solution**: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Guest Sessions Failing

**Symptom**: Error "Guest sessions require cache to be enabled"  
**Solution**: Redis is required for guests. Add environment variables.

### Stale Cache Data

**Symptom**: Updates not reflected immediately  
**Solution**: Check parallel write implementation - both cache and DB should update

### High Memory Usage

**Symptom**: Redis hitting memory limits  
**Solution**: 
- Implement TTL for inactive chats
- Use Redis eviction policy (e.g., `allkeys-lru`)

## Future Enhancements

### Optional Improvements

1. **TTL Strategy**: Add expiration for inactive guest chats
2. **Cache Warming**: Proactive warming for popular chats
3. **Compression**: Compress large message payloads
4. **Regional Caching**: Multi-region Redis for global performance
5. **Analytics**: Detailed cache performance tracking

## Code Examples

### Reading a Chat

```typescript
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

// Automatically uses cache if available
const chat = await getChatById({ id: chatId, userId });
const messages = await getMessagesByChatId({ id: chatId, userId });
```

### Writing Messages

```typescript
import { saveMessages } from '@/lib/db/queries';

// Writes to both PostgreSQL and Redis in parallel
await saveMessages({ messages: [...] });
```

### Guest User Operations

```typescript
import { saveGuestChat, saveGuestMessages } from '@/lib/cache/guest-queries';

// Cache-only for guests
if (userType === 'guest') {
  await saveGuestChat({ id, userId, title, visibility });
  await saveGuestMessages({ messages, userId });
}
```

## Testing

### Verify Cache Working

1. Check console logs for "✅ Upstash Redis client initialized"
2. First chat load will show DB query
3. Subsequent loads should be faster (cache hit)
4. Inspect Redis dashboard for key count

### Load Testing

Use tools like k6 or Artillery to verify:
- Cache hit rates increase over time
- Response times decrease after warm-up
- Database load remains constant under traffic

## Summary

The Upstash Redis caching layer provides:

✅ **Faster responses** - Cache-first reads  
✅ **Lower latency** - Parallel writes  
✅ **Reduced DB load** - Guest cache-only  
✅ **Simplified architecture** - No resumable streams  
✅ **Edge-optimized** - Perfect for Vercel Fluid Compute  

The implementation is production-ready and scales automatically with your application.
