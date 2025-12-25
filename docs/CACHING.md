# Caching Strategy

> Next.js 16.1.0 native caching with `"use cache"` directive

## Overview

This application uses Next.js 16.1.0's native caching capabilities:

- **`"use cache"`** directive for server-side caching
- **`cacheLife`** profiles for TTL configuration
- **`cacheTag`** for tag-based invalidation
- **`updateTag`** for read-your-writes consistency

## cacheLife Profiles

Custom profiles are configured in `next.config.ts`:

```typescript
// next.config.ts
cacheLife: {
  // Message history - medium freshness
  chatMessages: {
    stale: 60,       // 1 min - serve stale while revalidating
    revalidate: 300, // 5 min - background revalidation
    expire: 3600,    // 1 hour - hard expiry
  },
  // Chat sidebar list - higher freshness needed
  userChats: {
    stale: 30,       // 30s
    revalidate: 120, // 2 min
    expire: 1800,    // 30 min
  },
  // Document content - lower freshness acceptable
  documents: {
    stale: 120,      // 2 min
    revalidate: 600, // 10 min
    expire: 7200,    // 2 hours
  },
  // AI suggestions - lowest freshness needed
  suggestions: {
    stale: 300,      // 5 min
    revalidate: 900, // 15 min
    expire: 86400,   // 24 hours
  },
}
```

### Profile Selection Guide

| Data Type | Profile | Rationale |
|-----------|---------|-----------|
| Chat messages | `chatMessages` | Users expect recent messages quickly |
| Chat list | `userChats` | Sidebar needs frequent updates |
| Documents | `documents` | Content changes less frequently |
| AI suggestions | `suggestions` | Can be stale longer |

## CacheTags Utility

Centralized tag generators ensure consistent naming:

```typescript
// lib/cache/tags.ts
export const CacheTags = {
  chat: (chatId: string) => `chat-${chatId}`,
  chatMessages: (chatId: string) => `chat-messages-${chatId}`,
  userChats: (userId: string) => `user-chats-${userId}`,
  document: (documentId: string) => `document-${documentId}`,
  userDocuments: (userId: string) => `user-documents-${userId}`,
  suggestions: (documentId: string, userId?: string) =>
    userId ? `suggestions-${documentId}-${userId}` : `suggestions-${documentId}`,
  votes: (chatId: string) => `votes-${chatId}`,
  session: (userId: string) => `session-${userId}`,
};
```

## Usage Patterns

### Caching Data Fetches

```typescript
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/tags";

async function getChatMessages(chatId: string) {
  "use cache";
  cacheLife("chatMessages");
  cacheTag(CacheTags.chatMessages(chatId));
  
  return db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: asc(messages.createdAt),
  });
}

async function getUserChats(userId: string) {
  "use cache";
  cacheLife("userChats");
  cacheTag(CacheTags.userChats(userId));
  
  return db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.updatedAt),
  });
}
```

### Cache Invalidation

#### In Server Actions (use `updateTag`)

`updateTag` provides read-your-writes consistency - the user sees their changes immediately:

```typescript
// features/chat/actions/send-message.ts
"use server";
import { updateTag } from "next/cache";
import { CacheTags } from "@/lib/cache/tags";

export async function sendMessage(chatId: string, content: string) {
  await db.insert(messages).values({ chatId, content });
  
  // Immediate invalidation - user sees new message right away
  updateTag(CacheTags.chatMessages(chatId));
  updateTag(CacheTags.chat(chatId));
}
```

#### In Route Handlers (use `revalidateTag`)

`revalidateTag` requires a profile parameter in Next.js 16.1.0:

```typescript
// app/api/chat/route.ts
import { revalidateTag } from "next/cache";
import { CacheTags } from "@/lib/cache/tags";

export async function POST(request: Request) {
  const { chatId, message } = await request.json();
  await db.insert(messages).values({ chatId, content: message });
  
  // Background revalidation - profile must match cacheLife
  revalidateTag(CacheTags.chatMessages(chatId), "chatMessages");
  
  return Response.json({ success: true });
}
```

### Decision Matrix: `updateTag` vs `revalidateTag`

| Aspect | `updateTag()` | `revalidateTag()` |
|--------|---------------|-------------------|
| Context | Server Actions only | Server Actions + Route Handlers |
| Consistency | Read-your-writes | Eventually consistent |
| Use When | User-initiated changes | Background/webhook updates |
| Performance | Immediate invalidation | Background revalidation |

## Common Invalidation Scenarios

| Action | Tags to Invalidate |
|--------|-------------------|
| Create chat | `userChats(userId)` |
| Send message | `chatMessages(chatId)`, `chat(chatId)` |
| Delete chat | `chat(chatId)`, `userChats(userId)` |
| Update document | `document(documentId)` |
| Delete document | `document(documentId)`, `userDocuments(userId)` |
| Create suggestion | `suggestions(documentId)` |

## Best Practices

1. **Always use CacheTags** - Never hardcode tag strings
2. **Match profiles** - `revalidateTag` profile must match `cacheLife` profile
3. **Prefer updateTag** - Use in Server Actions for immediate consistency
4. **Batch invalidations** - Call multiple `updateTag`s in one action
5. **Consider cascade** - Invalidate related caches (chat → userChats)

## Debugging Cache

```typescript
// Check if data is cached
console.log("Cache hit:", request.headers.get("x-nextjs-cache"));

// View cache tags on response
console.log("Cache tags:", response.headers.get("x-next-cache-tags"));
```

## Related Documentation

- [Next.js Caching Docs](https://nextjs.org/docs/app/building-your-application/caching)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- `.ouroboros/specs/nextjs-16-optimization/FINAL-research.md` - Detailed research

---

*Last updated: December 2024*
