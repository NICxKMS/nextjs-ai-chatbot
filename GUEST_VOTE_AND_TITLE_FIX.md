# Guest Vote & Title Update Fix

## Issues Fixed

### 1. Guest Users Vote Functionality
**Problem**: Guest users were attempting to fetch votes from the API, even though votes are not saved for guest users (no DB/cache storage).

**Solution**:
- Added `isGuest` check in `chat.tsx` to prevent vote API calls for guest users
- Modified vote fetch condition to include `!isGuest` flag
- Updated `Messages` component to accept `isGuest` prop
- Modified vote prop in `PreviewMessage` to be `undefined` for guest users
- Server already returns error for guest vote attempts (lines 29-35 in `api/vote/route.ts`)

**Files Changed**:
- `components/chat.tsx`: Added `useSession` import, `isGuest` check, and updated vote fetch condition
- `components/messages.tsx`: Added `isGuest` to `MessagesProps` type and conditional vote passing

### 2. Chat Title Pulsating After Stream Completes
**Problem**: After streaming completes and title is generated, the sidebar chat item continues to show pulsating animation and bullet point even after clicking on it. The issue had two parts:
1. React memo comparison was blocking re-renders when title changed
2. Optimistic chats were always rendered with pulsating UI, even after title was generated

**Solution**:
- Updated `ChatItem` memo comparison function to check for `chat.title` changes to trigger re-render
- Modified optimistic chat rendering logic to only show pulsating UI when title is still "Generating title..."
- Once the actual title is streamed and updates the optimistic chat, it renders normally without pulsating

**Files Changed**:
- `components/sidebar-history-item.tsx`: 
  - Updated memo comparison to include title change detection
  - Changed optimistic chat rendering to conditionally show pulsating UI only when generating

## Technical Details

### Vote Fetch Prevention (Client)
```typescript
// Before
const { data: votes } = useSWR<UserVote[]>(
  initialVotes === undefined && messages.length >= 2
    ? `/api/vote?chatId=${id}`
    : null,
  fetcher,
  { fallbackData: initialVotes }
);

// After
const { data: session } = useSession();
const isGuest = session?.user?.type === "guest";

const { data: votes } = useSWR<UserVote[]>(
  initialVotes === undefined &&
    messages.length >= 2 &&
    !isReadonly &&
    !isGuest
    ? `/api/vote?chatId=${id}`
    : null,
  fetcher,
  { fallbackData: initialVotes || [] }
);
```

### Vote Rendering
```typescript
// In Messages component
vote={
  !isGuest && votes
    ? votes.find((vote) => vote.messageId === message.id)
    : undefined
}
```

### Title Update Fix

**Part 1: Memo Comparison**
```typescript
// Before
export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});

// After
export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  // Re-render when title changes (for optimistic title updates from stream)
  if (prevProps.chat.title !== nextProps.chat.title) {
    return false;
  }
  return true;
});
```

**Part 2: Conditional Pulsating UI**
```typescript
// Before
if (isOptimistic) {
  return (
    // Always show pulsating UI for optimistic chats
    <span className="animate-pulse">{chat.title}</span>
  );
}

// After
const isTitleGenerating = isOptimistic && chat.title === "Generating title...";

if (isTitleGenerating) {
  return (
    // Only show pulsating UI while title is being generated
    <span className="animate-pulse">{chat.title}</span>
  );
}
// Once title is generated, render normally without pulsating
```

## Server-Side Protection

The vote API already has guest protection:
```typescript
// app/(chat)/api/vote/route.ts (lines 29-35, 87-93)
if (session.user.type === "guest") {
  return new ChatSDKError(
    "forbidden:vote:guest_cannot_vote",
    "Guest users cannot vote on messages"
  ).toResponse();
}
```

## Testing Recommendations

1. **Guest Vote Prevention**:
   - Log in as guest
   - Send messages (>= 2)
   - Verify no vote API calls in network tab
   - Verify no vote buttons shown on assistant messages

2. **Title Update**:
   - Start new chat
   - Send first message
   - Initially see "Generating title..." with pulsating dot in sidebar
   - Wait for stream to complete and title to generate
   - **Verify title updates immediately** to actual title **without pulsating** (no page reload needed)
   - The optimistic chat should show the real title without bullet point or pulsating
   - Eventually the optimistic chat gets replaced by the persisted chat from history

## Benefits

✅ **Reduced API calls**: Guest users no longer make unnecessary vote API requests  
✅ **Cleaner UI**: No vote buttons shown to guests who can't use them  
✅ **Better UX**: Titles update immediately when stream completes  
✅ **No pulsating glitch**: Sidebar chat items display correctly after title generation
