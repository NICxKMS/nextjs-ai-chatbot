# Cache Module

Upstash Redis caching layer for optimized performance and reduced database load.

## Quick Start

### 1. Environment Setup

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 2. Import and Use

```typescript
import { getChatFromCache, setChatInCache } from '@/lib/cache/operations';
import { isRedisAvailable } from '@/lib/cache/redis';

// Check if Redis is available
if (isRedisAvailable()) {
  const chat = await getChatFromCache(chatId, userId);
}
```

## Module Structure

### `redis.ts`
- **Purpose**: Initialize Upstash Redis client
- **Exports**: `getRedisClient()`, `isRedisAvailable()`

### `types.ts`
- **Purpose**: TypeScript type definitions for cached entities
- **Types**: `CachedChat`, `CachedMessage`, `CachedDocument`, `CacheKeys`

### `operations.ts`
- **Purpose**: Core cache operations for chats, messages, and documents
- **Functions**:
  - `getChatFromCache()` - Retrieve denormalized chat
  - `setChatInCache()` - Store complete chat with messages
  - `appendMessageToCache()` - Add new message to chat
  - `updateChatTitleInCache()` - Update chat title
  - `updateChatLastContextInCache()` - Update usage context
  - `deleteChatFromCache()` - Remove chat
  - `getUserChatsFromCache()` - Get user's chat list (ZSET)
  - `getDocumentFromCache()` - Retrieve document versions
  - `setDocumentInCache()` - Store document
  - `appendDocumentVersionToCache()` - Add document version

### `guest-queries.ts`
- **Purpose**: Cache-only operations for guest users
- **Functions**: Mirror standard queries but skip PostgreSQL

## Cache Keys

```typescript
const CacheKeys = {
  chat: (chatId, userId) => `chat:${chatId}:${userId}`,
  userChats: (userId) => `user:${userId}:chats`,
  document: (documentId, userId) => `document:${documentId}:${userId}`,
};
```

## Data Structures

### Denormalized Chat
```typescript
{
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  lastContext: AppUsage | null;
  messages: CachedMessage[]; // Full message array
  version: number;
}
```

### User Chats (ZSET)
```typescript
// Score: updatedAt timestamp
// Member: JSON.stringify({ chatId, title })
```

## Usage Patterns

### Cache-First Read
```typescript
const cached = await getChatFromCache(chatId, userId);
if (cached) {
  return cached; // Fast path
}

// Fallback to database
const fromDb = await fetchFromPostgreSQL();
await warmChatCache(chatId, userId, fromDb); // Background
return fromDb;
```

### Parallel Write
```typescript
await Promise.all([
  db.insert(chat).values(data), // PostgreSQL
  setChatInCache(id, userId, cachedData), // Redis
]);
```

### Guest User (Cache-Only)
```typescript
if (userType === 'guest') {
  await saveGuestMessages({ messages, userId });
  // No PostgreSQL write
}
```

## Performance

- **Cache Hit**: <50ms response time
- **Cache Miss**: ~200ms (DB + cache warm)
- **Parallel Write**: No user-perceived latency
- **Denormalized Structure**: 1 request vs N queries

## Error Handling

All cache operations include try-catch blocks and gracefully degrade:

```typescript
try {
  await setChatInCache(...);
} catch (error) {
  console.error("Redis error:", error);
  // Continue - PostgreSQL has data
}
```

## Development

### Testing Locally

1. Get free Upstash Redis: [upstash.com](https://upstash.com)
2. Add credentials to `.env.local`
3. Start dev server: `pnpm dev`
4. Check console for "✅ Upstash Redis client initialized"

### Debugging

```typescript
import { getRedisClient } from '@/lib/cache/redis';

const redis = getRedisClient();
if (redis) {
  // Inspect keys
  const keys = await redis.keys('chat:*');
  console.log('Cached chats:', keys);
  
  // View data
  const data = await redis.get('chat:123:user456');
  console.log('Chat data:', data);
}
```

## Best Practices

1. **Always provide userId**: Required for cache keys
2. **Non-blocking cache warming**: Use `.catch()` to avoid blocking
3. **Graceful degradation**: Check `isRedisAvailable()` before caching
4. **Consistent keys**: Use `CacheKeys` helper for all operations
5. **Background updates**: Warm cache after DB writes

## Monitoring

Track cache effectiveness:

```typescript
// In operations.ts (custom implementation)
console.log('Cache hit:', chatId);  // When returning cached data
console.log('Cache miss:', chatId); // When falling back to DB
```

Recommended metrics:
- Cache hit rate: >90% target for active users
- Average response time: <100ms
- Redis memory usage: Monitor in Upstash dashboard

## See Also

- [Full Implementation Guide](../../docs/upstash-redis-implementation.md)
- [Upstash Documentation](https://upstash.com/docs/redis)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
