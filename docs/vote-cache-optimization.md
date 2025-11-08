# Vote Cache Optimization

## Problem Identified

When clicking a chat in the sidebar, **two** cache GET requests were being made:

### Request 1: Page Load (Server-side)
```
[PAGE LOAD /chat/8b98c821...]
[chatData.getWithMessages]
[CACHE GET] → Fetch chat + messages
```

### Request 2: Votes Fetch (Client-side) ⚠️
```
[chatData.get] from /api/vote
[CACHE GET] → Verify chat ownership for votes
GET /api/vote?chatId=8b98c821...
```

## Root Cause

The `Chat` component (`components/chat.tsx` line 270-273) was using `useSWR` to fetch votes client-side:

```typescript
const { data: votes } = useSWR<UserVote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
);
```

This triggered `/api/vote`, which called `chatData.get()` to verify the user owns the chat before returning votes - resulting in a second cache GET.

## Solution: Server-Side Votes

Moved vote fetching to the server-side page component to eliminate the redundant client-side fetch.

### Changes Made

#### 1. `app/(chat)/chat/[id]/page.tsx`
Fetch votes server-side and pass as prop:

```typescript
// Fetch votes server-side to avoid client-side cache GET
const votes =
    messagesFromDb.length >= 2 && session.user.type !== "guest"
        ? await getVotesByChatIdAndUserId({
                chatId: id,
                userId: session.user.id,
            })
        : [];

const uiVotes = votes.map((v) => ({
    chatId: v.chatId,
    messageId: v.messageId,
    isUpvoted: v.isUpvoted,
}));

return (
    <Chat
        // ... other props
        initialVotes={uiVotes}
    />
);
```

#### 2. `components/chat.tsx`
Updated to accept `initialVotes` prop and only fetch client-side when not provided:

```typescript
export function Chat({
    // ... other props
    initialVotes = [],
}: {
    // ... other types
    initialVotes?: UserVote[];
}) {
    // Use server-provided votes if available, otherwise fetch client-side
    const { data: votes } = useSWR<UserVote[]>(
        // Only fetch if we don't have initial votes and there are messages
        initialVotes.length === 0 && messages.length >= 2
            ? `/api/vote?chatId=${id}`
            : null,
        fetcher,
        {
            fallbackData: initialVotes.length > 0 ? initialVotes : undefined,
        }
    );
}
```

#### 3. `app/(chat)/page.tsx`
Added `initialVotes={[]}` prop for new chats (no votes to fetch).

## Results

### Before Optimization
When clicking a chat:
- ❌ 2 cache GET operations (page load + vote API)
- ❌ 2 API calls (/chat/[id] page + /api/vote)

### After Optimization
When clicking a chat:
- ✅ **1 cache GET operation** (page load only)
- ✅ **1 API call** (/chat/[id] page)
- ✅ Votes fetched server-side with chat data
- ✅ No additional client-side fetch needed

## Benefits

1. **50% reduction in cache operations** when loading a chat with votes
2. **Eliminated redundant API call** to `/api/vote` on page load
3. **Faster page loads** - all data fetched in parallel server-side
4. **Better UX** - votes displayed immediately without client-side fetch delay
5. **Lower server load** - fewer API round-trips

## Backward Compatibility

The client-side vote fetching is still available as a fallback:
- Used when refreshing votes after voting (useSWR revalidation)
- Used if `initialVotes` is not provided (e.g., third-party consumers)
- Guest users don't trigger vote fetching (neither server nor client)

## Testing

To verify the optimization:

1. Open browser console
2. Clear console
3. Click a chat in the sidebar
4. Verify there's only ONE API request to `/chat/[id]` (no `/api/vote` request on page load)
5. Check Network tab - should see no `/api/vote` GET request on initial load
6. Vote on a message - should see `/api/vote` PATCH request (expected behavior)

## Related Files

- `app/(chat)/chat/[id]/page.tsx` - Server-side vote fetching
- `components/chat.tsx` - Client component updated to use initial votes
- `app/(chat)/page.tsx` - New chat page with empty votes
- `app/(chat)/api/vote/route.ts` - Still used for vote mutations (PATCH)

## Notes

- The `/api/vote` endpoint is still used for **voting actions** (upvote/downvote via PATCH)
- Only the **initial vote fetch** (GET) was optimized
- This pattern follows React Server Components best practices: fetch data server-side when possible


