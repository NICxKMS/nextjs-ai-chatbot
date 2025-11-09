# System Architecture

Core system design and data flow patterns.

## Architecture Overview

```
User → Next.js App → API Routes → Data Layer → Cache/DB → AI Providers
```

### Key Principles
- **Cache-First**: Redis checked before database queries
- **Unified Layer**: Single API for guest/auth users
- **Non-Blocking**: Streaming never waits for persistence
- **Type-Safe**: Full TypeScript coverage

## Data Access Layer

### Context Creation
```typescript
const ctx = createContext(session); // { userId, isGuest }
```

### Unified Operations
```typescript
// Works for both guest and authenticated users
await chatData.get(chatId, ctx);
await chatData.getWithMessages(chatId, ctx);
await messageData.saveWithContext(data, ctx);
```

### Storage Strategy
- **Guest Users**: Redis only (session-based)
- **Auth Users**: Redis + PostgreSQL (durable)

## Cache Architecture

### Redis Structure
```typescript
// Chat with denormalized messages
type CachedChat = {
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  messages: CachedMessage[];
  lastContext: AppUsage | null;
  version: number;
};
```

### Key Patterns
- `chat:{chatId}:{userId}` - Chat data with messages
- `user:{userId}:chats` - User's chat list (sorted set)
- `user:{userId}:msg_count:{date}` - Daily message quota

### Operations
- **Pipeline**: Multiple Redis commands in single round-trip
- **Batch**: Atomic updates for chat + messages + context
- **Warm**: Background cache population on DB queries

## Database Schema

### Core Tables
```sql
users (id, email, password_hash, created_at)
chats (id, user_id, title, visibility, last_context, created_at, updated_at)
messages (id, chat_id, role, parts, attachments, created_at)
votes (id, chat_id, message_id, user_id, type, created_at)
```

### Key Indexes
- `chats(user_id, created_at)` - User chat list
- `messages(chat_id)` - Message retrieval
- `votes(chat_id, message_id)` - Vote lookups

## API Design

### Chat Flow
1. **Request**: POST `/api/chat` with message
2. **Auth**: Validate session, check quota
3. **Fetch**: Get chat history (cache-first)
4. **Stream**: Send to AI provider, stream response
5. **Persist**: Save messages in `onFinish` callback

### Streaming
```typescript
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    await streamText({
      model,
      messages,
      onFinish: async (result) => {
        // Non-blocking persistence
        await messageData.saveWithContext(data, ctx);
      },
    });
  },
});
```

## Component Architecture

### Main Components
- **Chat**: Core chat interface with streaming
- **Sidebar**: Chat history and navigation
- **Artifacts**: Generated content display
- **Input**: Multimodal message composition

### Data Flow
```
Server Component → Client Component → Hooks → API Routes → Data Layer
```

## Performance Patterns

### Optimization Strategies
- **Batch Operations**: Reduce Redis round-trips
- **Parallel Execution**: Independent operations run concurrently
- **Lazy Loading**: Components load data as needed
- **Cache Warming**: Background population on cache misses

### Metrics
- **TTFB**: ~560ms (-30% improvement)
- **LCP**: ~1.5s (-29% improvement)
- **Cache Hit Rate**: >90% for active chats
- **Redis Operations**: 13 → 2-3 per message
