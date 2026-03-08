# Waterfall Fixes

All sequential-to-parallel transformations applied during the optimization campaign.

---

## Summary

Five waterfall patterns were identified and resolved across Waves 2b and 3. Combined estimated savings: **~350–500 ms off critical paths** (page load TTFB, API pre-stream latency, vote action round-trip).

---

## Fixes

| Fix | Wave | Before | After |
|-----|------|--------|-------|
| Chat page sequential fetch | W2b | Messages fetch blocked behind access control check in `getChatPageState` (~200–350 ms sequential) | Speculative `getMessagesByChatId` fires in parallel with `getChatPageState` in `chat/[id]/page.tsx` (~140 ms saved) |
| Chat API sequential pipeline | W2b | Messages query blocked behind model resolution + chat validation (~200–450 ms sequential) | Messages added to `Promise.all` inside `resolveChatRouteContext` — model, chat, and messages resolve concurrently |
| Vote action sequential DB calls | W3 | `getChatById` then `getMessageById` — two sequential round-trips in `vote.ts` | `Promise.all([getChatOwnerId, getMessageById])` — ownership check and message fetch run in parallel |
| StreamBridge render indirection | W2b | 2 extra React component frames (~32 ms) routing SSE deltas through `StreamBridge` into the artifact store | `StreamBridge` deleted; direct `onData` callback in `useChatSession` writes to artifact store immediately |
| Store emission flooding | W2b | N `setState`/`emitChange` calls per `requestAnimationFrame` frame, triggering N re-renders | `batchUpdate` in `artifact-store.ts` accumulates mutations, emits a single change notification per frame |

---

## Files Changed

| Fix | Primary Files |
|-----|---------------|
| Chat page sequential fetch | `app/(chat)/chat/[id]/page.tsx` |
| Chat API sequential pipeline | `features/chat/server/resolve-chat-route-context.ts` |
| Vote action sequential DB calls | `features/voting/actions/vote.ts` |
| StreamBridge render indirection | `features/chat/hooks/use-chat-session.ts`, deleted `StreamBridge` component |
| Store emission flooding | `features/artifacts/stores/artifact-store.ts` |
