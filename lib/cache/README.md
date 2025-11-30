# Cache Module

Upstash Redis caching layer for optimized performance and reduced database load.

## Architecture: Redis List-Based Storage

**Performance characteristics:**

- **Message append: O(1)** via Redis List RPUSH
- **Get all messages: O(N)** via LRANGE
- **Get last N messages: O(N)** via LRANGE -N -1
- **Metadata updates: O(1)** via simple SET

**Key structure:**

```
chat:{chatId}:{userId}:meta  → JSON string (metadata only)
chat:{chatId}:{userId}:msgs  → Redis List (messages as JSON strings)
user:{userId}:chats          → ZSET (chat IDs sorted by updatedAt)
```

## Quick Start

### 1. Environment Setup

```bash
CACHE_KV_REST_API_URL=https://your-redis.upstash.io
CACHE_KV_REST_API_TOKEN=your_token_here
```

### 2. Import and Use

```typescript
import { getChatFromCache, appendMessageToCache } from "@/lib/cache/operations";
import { isRedisAvailable } from "@/lib/cache/redis";

// Check if Redis is available
if (isRedisAvailable()) {
  // Full chat with messages
  const chat = await getChatFromCache(chatId, userId);

  // O(1) message append - no JSON rewrite!
  await appendMessageToCache(chatId, userId, newMessage);

  // Get only last 20 messages (efficient for preview)
  const recent = await getLastMessagesFromCache(chatId, userId, 20);
}
```

## Module Structure

### `redis.ts`

- **Purpose**: Initialize Upstash Redis client
- **Exports**: `getRedisClient()`, `isRedisAvailable()`

### `types.ts`

- **Purpose**: TypeScript type definitions for cached entities
- **Types**: `CachedChatMeta`, `CachedChat`, `CachedMessage`, `CacheKeys`

### `operations.ts`

- **Purpose**: Core cache operations using Redis List for messages
- **Functions**:
  - `getChatFromCache()` - Get full chat (meta + messages)
  - `getChatMetaFromCache()` - Get metadata only (faster)
  - `getLastMessagesFromCache()` - Get last N messages
  - `getMessageCountFromCache()` - Get message count O(1)
  - `setChatInCache()` - Store complete chat
  - `appendMessageToCache()` - **O(1) message append**
  - `appendMessagesToCache()` - **O(M) bulk append**
  - `updateChatTitleInCache()` - Update title
  - `updateChatLastContextInCache()` - Update context
  - `deleteChatFromCache()` - Remove chat
  - `getUserChatsFromCache()` - Get user's chat list

### `batch-operations.ts`

- **Purpose**: Optimized batch operations
- **Functions**:
  - `batchUpdateChatCache()` - Update meta + append messages
  - `createOrUpdateChatWithMessages()` - Create/update in one op

### `helpers.ts`

- **Purpose**: Conversion utilities
- **Functions**: `dbMessageToCachedMessage()`, `groupMessagesByChatId()`

## Cache Keys

```typescript
const CacheKeys = {
  chatMeta: (chatId, userId) => `chat:${chatId}:${userId}:meta`,
  chatMessages: (chatId, userId) => `chat:${chatId}:${userId}:msgs`,
  userChats: (userId) => `user:${userId}:chats`,
  document: (documentId, userId) => `document:${documentId}:${userId}`,
  // Legacy (for backward compatibility during migration)
  chat: (chatId, userId) => `chat:${chatId}:${userId}`,
};
```

## Data Structures

### Chat Metadata (String)

```typescript
type CachedChatMeta = {
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastContext: AppUsage | null;
  version: number;
};
```

### Messages (Redis List)

```typescript
// Each element is a JSON string of CachedMessage
type CachedMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  attachments: MessageAttachment[];
  createdAt: string; // ISO string
};
```

### User Chats (ZSET)

```
Score: updatedAt timestamp (milliseconds)
Member: chatId string
```

## Performance Comparison

| Operation         | Old (JSON blob)  | New (Redis List) |
| ----------------- | ---------------- | ---------------- |
| Append 1 message  | O(N) rewrite     | **O(1)**         |
| Append M messages | O(N) rewrite     | **O(M)**         |
| Read all messages | O(1) + parse     | O(N)             |
| Read last 20      | O(1) + parse all | **O(20)**        |
| Update title      | O(N) via Lua     | **O(1)**         |
| Message count     | O(1) + parse     | **O(1)** LLEN    |

## Usage Patterns

### O(1) Message Append

```typescript
// Before: O(N) - had to rewrite entire JSON blob
// After: O(1) - just RPUSH to list
await appendMessageToCache(chatId, userId, {
  id: msgId,
  chatId,
  role: "assistant",
  parts: [...],
  attachments: [],
  createdAt: new Date().toISOString(),
});
```

### Efficient Chat Preview

```typescript
// Get only metadata + last 20 messages (fast)
const meta = await getChatMetaFromCache(chatId, userId);
const recentMessages = await getLastMessagesFromCache(chatId, userId, 20);
```

### Bulk Message Append

```typescript
// Append multiple messages efficiently - O(M)
await appendMessagesToCache(chatId, userId, [msg1, msg2, msg3]);
```

## Error Handling

All cache operations include try-catch blocks and gracefully degrade:

```typescript
try {
  await appendMessageToCache(...);
} catch (error) {
  logError("Redis error:", error);
  // Continue - PostgreSQL has data
}
```

## Best Practices

1. **Use `appendMessageToCache`** for streaming responses - O(1) per message
2. **Use `getChatMetaFromCache`** for list views - skip message parsing
3. **Use `getLastMessagesFromCache`** for previews - avoid loading all messages
4. **Check `isRedisAvailable()`** before operations
5. **Use pipeline operations** for batch updates

## Monitoring

Track cache effectiveness:

- Cache hit rate: >90% target for active users
- Average append latency: <10ms (O(1) operation)
- Message list length: Monitor for very long chats

## See Also

- [Redis Cache Keymap](../../docs/redis-cache-keymap.md)
- [Upstash Documentation](https://upstash.com/docs/redis)
- [Redis List Commands](https://redis.io/docs/data-types/lists/)
