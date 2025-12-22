# ⚡ Server Actions Issues

**Total**: 12 issues
**High**: 4 | **Medium**: 4 | **Low**: 4

## Summary Table

| #    | Issue                                | Severity | File                  | Status       | Verified                           |
| ---- | ------------------------------------ | -------- | --------------------- | ------------ | ---------------------------------- |
| #285 | deleteMessagesAfterTimestamp cascade | HIGH     | actions/messages.ts   | ❌ CLOSED    | NOT CONFIRMED (cascade works)      |
| #286 | updateVisibility TODO stub           | HIGH     | actions/visibility.ts | ✅ CONFIRMED | TODO stub - no actual DB call      |
| #287 | deleteMessages TODO stub             | HIGH     | actions/messages.ts   | ✅ CONFIRMED | TODO stub - no actual DB call      |
| #288 | voteOnMessage type validation        | MEDIUM   | actions/vote.ts       | ❌ CLOSED    | NOT CONFIRMED (TS validates)       |
| #289 | removeVote design                    | MEDIUM   | actions/vote.ts       | ❌ CLOSED    | NOT CONFIRMED (append-only design) |
| #290 | Missing doc filtering                | MEDIUM   | actions/documents.ts  | ❌ CLOSED    | NOT CONFIRMED (filters by doc)     |
| #291 | Missing ownership check              | MEDIUM   | actions/visibility.ts | ❌ CLOSED    | NOT CONFIRMED (ownership checked)  |
| #292 | No optimistic update revert          | HIGH     | actions/chat.ts       | ✅ CONFIRMED | No rollback on failure             |

## Pattern: All Actions Return Success Without Persisting

Multiple server actions have the same problem:

1. Validate input ✅
2. Check session ✅
3. TODO: Actual database operation ❌
4. Return success (but nothing happened!)

**Files affected**:

- features/chat/actions/messages.ts
- features/chat/actions/vote.ts
- features/chat/actions/visibility.ts

**Fix Pattern**:

```typescript
// After TODO, call actual data layer
await deleteMessagesFromChatCached(chatId, timestamp, ctx);
revalidatePath(`/chat/${chatId}`);
return { success: true };
```
