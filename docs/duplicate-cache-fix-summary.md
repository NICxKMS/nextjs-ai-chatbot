# Duplicate Cache GET Requests Fix

## Issue
When clicking a chat item in the sidebar history, two GET requests were being made to the Redis cache for the same chat key:
```
GET "chat:8b98c821-e322-4a79-bdad-1b658cdbfa89:5e983dcd-0077-4f1f-a079-db483e7ae981"
GET "chat:8b98c821-e322-4a79-bdad-1b658cdbfa89:5e983dcd-0077-4f1f-a079-db483e7ae981"
```

This occurred in both:
- Authenticated and guest users
- Production and development modes

## Root Cause
In `app/(chat)/api/chat/route.ts`, the POST endpoint was making two separate calls:
1. `chatData.get(id, ctx)` - to fetch chat metadata
2. `messageData.getForChat(id, ctx)` - to fetch messages

Both methods internally call `getChatFromCache()`, resulting in duplicate Redis GET operations.

## Solution
Replaced the two separate calls with a single optimized call to `chatData.getWithMessages(id, ctx)`, which:
- Fetches both chat metadata and messages in a single cache operation
- Returns a denormalized structure containing both chat and messages
- Eliminates the duplicate cache GET request

### Changes Made

#### 1. app/(chat)/api/chat/route.ts (lines 142-167)
**Before:**
```typescript
const [messageCount, chat, messagesFromDb] = await Promise.all([
    getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 24,
    }),
    chatData.get(id, ctx),              // ❌ First cache GET
    messageData.getForChat(id, ctx),    // ❌ Second cache GET
]);
```

**After:**
```typescript
const [messageCount, chatWithMessages] = await Promise.all([
    getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 24,
    }),
    chatData.getWithMessages(id, ctx),  // ✅ Single cache GET
]);

const chat = chatWithMessages?.chat;
const messagesFromDb = chatWithMessages?.messages || [];
```

## Additional Cleanup: Deprecated Auto-Resume Feature

### Issue
The `useAutoResume` hook and `autoResume` prop were deprecated and no longer needed.

### Changes Made

#### 1. Deleted `hooks/use-auto-resume.ts`
Removed the entire deprecated hook file.

#### 2. components/chat.tsx
- Removed `import { useAutoResume } from "@/hooks/use-auto-resume"`
- Removed `autoResume` prop from component signature
- Removed `useAutoResume()` hook usage
- Removed `resumeStream` from `useChat` destructuring

#### 3. app/(chat)/chat/[id]/page.tsx
- Removed `autoResume={true}` prop from `<Chat>` component

#### 4. app/(chat)/page.tsx
- Removed `autoResume={false}` prop from `<Chat>` component

## Benefits

### Performance Improvements
1. **50% reduction in cache operations** when loading a chat (2 → 1 GET request)
2. **Lower latency** due to single round-trip to Redis
3. **Reduced network overhead** for both development and production

### Code Quality Improvements
1. **Cleaner API usage** - single method for fetching chat with messages
2. **Removed deprecated code** - eliminated unused auto-resume functionality
3. **Consistent with refactor goals** - aligns with "at most one cache read" principle

## Verification
After this fix, clicking a chat in the sidebar should result in exactly **one** Redis GET operation instead of two.

To verify in development:
1. Enable Redis logging
2. Click a chat in the sidebar
3. Observe only one GET request for the chat key in logs

## Related Documentation
- See `lib/data/chat.ts` for the optimized `chatData.getWithMessages()` implementation
- See `docs/migration-evidence.md` for overall refactor principles
- See `docs/redis-cache-keymap.md` for cache structure details


