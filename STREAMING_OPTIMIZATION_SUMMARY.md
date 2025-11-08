# Streaming Optimization - Non-Blocking DB/Cache Writes

## Overview
All synchronous DB and cache writes have been optimized to run **concurrently with streaming** or **after streaming completes**, eliminating latency introduced by blocking database operations.

## Key Changes

### 1. **Chat Route (`app/(chat)/api/chat/route.ts`)**
- **Removed blocking chat creation** before streaming starts (line 191-192)
- Chat creation now happens in `onFinish` callback (after streaming completes)
- Streaming response starts immediately without waiting for DB writes

### 2. **Message Save with Context (`lib/data/chat.ts` - `saveWithContext`)**
- **For new chats**: Chat creation → Message insert → Cache update (sequential DB, parallel cache)
- **For existing chats**: Message insert + Context update run in parallel with cache updates
- All operations complete in `onFinish` callback (non-blocking to streaming)

**Flow for new chats:**
```
DB: chat creation → message insert → context update (sequential due to FK)
Cache: parallel with DB operations
```

**Flow for existing chats:**
```
DB: message insert + context update (parallel)
Cache: parallel with DB operations
```

### 3. **Chat Updates (`lib/data/chat.ts`)**
- **updateTitle**: Cache + DB updates run in parallel
- **updateVisibility**: Cache + DB updates run in parallel  
- **updateContext**: Cache + DB updates run in parallel

### 4. **Chat Deletion (`lib/data/chat.ts`)**
- DB cleanup (votes, messages, chat) wrapped in async IIFE
- Cache deletion runs in parallel with DB operations
- No blocking operations

### 5. **Message Deletion (`lib/data/chat.ts` - `deleteAfterTimestamp`)**
- Cache deletion runs in parallel with DB deletion
- No sequential blocking

### 6. **Document Operations (`lib/data/document.ts`)**
- **save**: DB insert + cache append run in parallel
- **deleteAfterTimestamp**: DB deletion + cache deletion run in parallel

## Consistency with Codebase

✅ **Promise.all() pattern**: Used throughout for parallel operations
✅ **Async IIFE**: Wraps sequential DB operations that have dependencies
✅ **Error handling**: Maintained with try-catch blocks
✅ **Guest vs Auth**: Separate code paths preserved
✅ **Cache-first strategy**: Maintained for reads, parallel writes for updates

## Streaming Impact

### Before Optimization
```
Request → Chat creation (BLOCKING) → Start streaming → Finish streaming → Save messages
Latency: Chat creation delay added to first response time
```

### After Optimization
```
Request → Start streaming immediately → Finish streaming → Save chat + messages (parallel)
Latency: Zero blocking operations before streaming starts
```

## Testing Recommendations

1. **New chat creation**: Verify streaming starts immediately
2. **Message persistence**: Confirm all messages saved after streaming
3. **Chat updates**: Verify title/visibility updates don't block
4. **Message deletion**: Confirm cache and DB stay in sync
5. **Guest sessions**: Verify cache-only operations work correctly

## Error Handling Improvements

### Graceful Database Error Recovery

All page routes now handle database errors gracefully instead of crashing:

#### Home Page (`app/(chat)/page.tsx`)
- **getUserById failure**: Redirects to `/?notice=database_error`
- Session remains intact, user can retry or continue as guest

#### Chat Detail Page (`app/(chat)/chat/[id]/page.tsx`)
- **chatData.getWithMessages failure**: Redirects to `/?notice=database_error`
- **getVotesByChatIdAndUserId failure**: Continues without votes (graceful degradation)
- **Chat not found**: Redirects to `/?notice=chat_not_found`

### Error Notice Query Parameters

The following notice values are supported:
- `database_error`: Database connection or query failed
- `chat_not_found`: Requested chat doesn't exist or access denied
- `user_not_found`: User account missing, converting to guest

### Benefits

✅ **No crash on DB errors**: Users see error message instead of 500 error
✅ **Session preserved**: No forced logout on temporary DB issues
✅ **Graceful degradation**: Votes fail silently, chat continues to load
✅ **Clear error messages**: Users understand what went wrong

## Notes

- All FK constraints properly handled with sequential DB operations where needed
- Cache operations always run in parallel with DB (no dependency)
- Error handling follows redirect pattern with query parameters for notices
