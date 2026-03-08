FLOW: Pending Chats (Optimistic Sidebar → Title Patch → SWR Confirmation → Cleanup)
ENTRY: User sends first message in a new chat → `useChatSession.sendMessage()` calls `onNewChat?()` callback
STEPS:
  1. `ChatShell` creates hook: `useChatSession({ ..., onNewChat: addPendingChat, onTitleUpdate: (chatId, title) => patchPendingChat(chatId, { title }) })` — wires pending chats provider to chat session
  2. User submits first message → `sendMessage()` detects `messages.length === 0` → calls `callbacksRef.current.onNewChat?.({ id, title: text.slice(0, 50), visibility, createdAt: new Date() })`
  3. `PendingChatsProvider.add(chat)` → checks `reservedIds.current.has(chat.id)` (prevents duplicates) → if not reserved: `reservedIds.current.add(chat.id)` → `setEntries(prev => [{ ...chat, isOptimistic: true }, ...prev])` — prepends to entry list
  4. `SidebarHistoryClient` → `usePendingChats()` → reads `entries` → computes `visiblePending = pendingEntries.filter(e => e.isOptimistic && !serverIds.has(e.id) && !deletedIds.has(e.id))` — shows only optimistic entries not yet confirmed by server
  5. `visiblePending` entries are converted via `pendingToChat(pending)` → rendered at top of "Today" group (or as standalone pending group above history)
  6. SSE stream delivers `data-chat-title` → `useChatSession.onData` → `callbacksRef.current.onTitleUpdate?.(id, dataPart.data)` → calls `patchPendingChat(chatId, { title })`
  7. `PendingChatsProvider.patch(id, patch)` → `setEntries(prev => prev.map(entry => entry.id === id ? { ...entry, ...patch } : entry))` — title updates in the pending entry → sidebar item re-renders with streamed title
  8. Meanwhile, server has saved the chat to the database → cache tag invalidated → next SWR revalidation (focus, reconnect, or `revalidateFirstPage: false` + background refresh) returns the chat in history
  9. `SidebarHistoryClient.useEffect([pendingEntries, rawServerChats])` → iterates pending entries → if `serverChatsById.has(entry.id)`:
     - If `entry.isOptimistic` → calls `markConfirmed(entry.id)` → `setEntries(prev => prev.map(e => e.id === id ? { ...e, isOptimistic: false } : e))` — entry no longer appears in `visiblePending`
     - If `!entry.isOptimistic` (already confirmed) → checks if `serverChat.title === entry.title && serverChat.visibility === entry.visibility` → if server has caught up → `removePending(entry.id)` → `dropEntry(id, shouldReleaseId=true)` → removes from entries + releases from reservedIds
  10. Between confirmation and removal: `serverChats = rawServerChats.map(chat => { const pending = pendingEntryById.get(chat.id); return pending ? { ...chat, title: pending.title, visibility: pending.visibility } : chat })` — pending metadata overlays server data until server copy catches up with streamed title
  11. On chat deletion: `handleDeleteConfirm()` → `setDeletedIds(prev => new Set(prev).add(id))` + `removePending(id)` → optimistic removal from both pending and server-rendered lists → server action `deleteChat({ chatId })` → if failure: rollback `deletedIds`, show toast error
BOTTLENECKS:
  - The reconciliation `useEffect` runs on every change to `pendingEntries` or `rawServerChats` — iterates ALL pending entries against ALL server chats. For typical usage (1-2 pending), this is negligible. For edge cases with many rapid new chats, it's O(n*m).
  - SWR revalidation timing determines how long the pending entry stays visible. `revalidateFirstPage: false` means the server chat may not appear until `revalidateOnFocus` or `revalidateOnReconnect` triggers — could be seconds.
  - Title patch from stream arrives as a single update — but the title may be generated progressively by the LLM. Currently only the final `data-chat-title` event updates the pending entry.
WASTE:
  - `reservedIds` is a `useRef(new Set())` — it persists across renders but is never cleaned up on unmount. If `PendingChatsProvider` unmounts and remounts (unlikely in layout), stale IDs remain.
  - The overlay pattern (`serverChats.map(chat => pending ? { ...chat, ...pending } : chat)`) creates new objects for every server chat that has a pending overlay, even if the values haven't changed since last render. The `useMemo` dependency on `pendingEntryById` means a new Map reference triggers recomputation.
  - `pendingToChat(pending)` creates a synthetic `Chat` object with fake fields (`userId: ""`, `model: null`) — type-safe but introduces lie values that could cause bugs if `SidebarHistoryItem` ever reads those fields.
SIMPLIFICATION OPPORTUNITIES:
  - The two-phase confirmation (isOptimistic → false, then full removal when server catches up) could be collapsed into a single phase if SWR revalidation is triggered immediately after `onNewChat`. A `mutate()` call on the sidebar SWR cache after the first message would pull server data faster.
  - The `markConfirmed` → `removePending` lifecycle adds state transitions that are hard to reason about. Consider: just keep `isOptimistic` entries until server data confirms, then remove in one step.
  - The `pendingEntryById` Map rebuilt on every `pendingEntries` change — for 1-2 entries typical, could just use `Array.find` and skip the Map allocation.
EXIT: Sidebar shows the new chat immediately (optimistic), title updates as stream delivers it, entry transitions to server-backed when SWR confirms, and pending metadata overlay ensures no title/visibility flicker during the gap. Chat deletion is optimistic with rollback on failure.
