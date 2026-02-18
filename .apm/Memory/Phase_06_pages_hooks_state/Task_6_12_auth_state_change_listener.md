---
important_findings: false
compatibility_issues: false
ad_hoc_delegation: false
---

# Task 6.12: Add Auth State Change Listener

## Summary

Implemented multi-tab auth session synchronization using BroadcastChannel API with localStorage fallback. Added a dedicated session API endpoint and a logout handler hook that supports stream abortion for the edge case of logout during streaming.

## Implementation Details

### Files Created

1. **`app/api/auth/session/route.ts`** - New session API endpoint
   - Returns current session state for client-side polling
   - Used by AuthProvider to refresh session on cross-tab sync events

2. **`features/auth/hooks/use-logout-handler.ts`** - Logout handler hook
   - Provides logout function with cross-tab synchronization
   - Supports `onBeforeLogout` callback for stream abortion
   - Broadcasts logout to other tabs before clearing session

### Files Modified

1. **`features/auth/components/auth-provider.tsx`** - Enhanced AuthProvider
   - Added BroadcastChannel-based cross-tab communication
   - Added localStorage event fallback for broader compatibility
   - Broadcasts login/logout events to other tabs
   - Listens for auth events from other tabs
   - Refreshes session on receiving login/session-update events
   - Clears session on receiving logout events

2. **`features/auth/hooks/index.ts`** - Added export for `useLogoutHandler` hook

## Technical Approach

### Cross-Tab Synchronization

The implementation uses a dual-channel approach for maximum compatibility:

1. **BroadcastChannel API** (primary)
   - Real-time cross-tab communication
   - Supported in modern browsers
   - Channel name: `auth-state-channel`

2. **localStorage Events** (fallback)
   - Works in all browsers
   - Uses storage events to detect changes
   - Key: `auth-state-sync`

### Event Types

- `login` - Broadcast when user logs in
- `logout` - Broadcast when user logs out
- `session-update` - Broadcast when session is updated

### Edge Case: Logout During Streaming

The `useLogoutHandler` hook accepts an `onBeforeLogout` callback that can be used to abort active streams before logout:

```tsx
function ChatComponent() {
  const { stop } = useChat();
  const handleLogout = useLogoutHandler({
    onBeforeLogout: () => stop(),
  });
  
  return <button onClick={handleLogout}>Logout</button>;
}
```

## Comparison with OLD Implementation

| Aspect | OLD (archive/oldapp) | NEW |
|--------|---------------------|-----|
| Auth Provider | Supabase `onAuthStateChange` | Custom AuthProvider with BroadcastChannel |
| Cross-Tab Sync | Supabase built-in | BroadcastChannel + localStorage fallback |
| Session Refresh | Automatic via Supabase | Manual fetch via `/api/auth/session` |
| Logout Handling | Supabase signOut | Custom hook with stream abortion support |

## Quality Gates

- [x] `pnpm format` - Passed (fixed 2 files)
- [x] `pnpm typecheck` - Passed (0 errors)
- [x] `pnpm lint` - Passed (0 errors)

## Testing Notes

Manual testing recommended:
1. Open app in multiple tabs
2. Login in one tab - verify other tabs update
3. Logout in one tab - verify other tabs clear session
4. Start streaming in one tab, logout in another - verify stream is aborted

## Dependencies

- No new npm packages required
- Uses native BroadcastChannel API
- Uses native localStorage API