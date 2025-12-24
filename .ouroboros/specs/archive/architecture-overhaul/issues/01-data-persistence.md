# 💾 Data Persistence Issues

**Total**: 7 issues
**Critical**: 4 | **High**: 2 | **Medium**: 1

## Summary Table

| #   | Issue                                            | Severity | File                                | Status  |
| --- | ------------------------------------------------ | -------- | ----------------------------------- | ------- |
| #1  | Chat persistence - onFinish missing saveChat     | CRITICAL | app/api/chat/route.ts               | 🔴 OPEN |
| #9  | DELETE /api/chat endpoint missing                | CRITICAL | app/api/chat/                       | 🔴 OPEN |
| #10 | Server Actions return success without persisting | CRITICAL | features/chat/actions/              | 🔴 OPEN |
| #19 | User system prompt missing implementation        | CRITICAL | lib/ai/prompts/                     | 🔴 OPEN |
| #50 | Vote action returns success but never persists   | HIGH     | features/chat/actions/vote.ts       | 🔴 OPEN |
| #51 | Visibility update action is stub                 | HIGH     | features/chat/actions/visibility.ts | 🔴 OPEN |
| #52 | Message deletion action is stub                  | MEDIUM   | features/chat/actions/messages.ts   | 🔴 OPEN |

---

## Issue #1 - Chat Persistence Missing

**Severity**: 🔴 CRITICAL
**File**: app/api/chat/route.ts

**Description**:
The chat API's `onFinish` callback is missing the `saveChat()` call. Messages are streamed to the client but NEVER persisted to the database.

**Evidence**:

```typescript
onFinish: async ({ response }) => {
    // Token usage logged but saveChat() is MISSING
    console.info("[Chat API] Token usage:", {...});
}
```

**Impact**:

- All chat messages are lost on page refresh
- Chat history is empty
- Core functionality broken

**Fix**:

```typescript
onFinish: async ({ response }) => {
    await saveChat({ id: chatId, userId, messages: response.messages });
    console.info("[Chat API] Token usage:", {...});
}
```

### Verification

- **Status**: ✅ CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: `app/api/chat/route.ts` onFinish only logs usage, never calls saveChat/createChat. Data layer functions exist but are NEVER called.
- **Severity**: UNCHANGED (CRITICAL)

---

## Issue #9 - DELETE /api/chat Endpoint Missing

**Severity**: 🔴 CRITICAL
**File**: app/api/chat/

**Description**:
No endpoint exists to delete individual chats. The API only has POST/GET.

**Impact**:

- Users cannot delete chats
- Chat history accumulates forever
- No data cleanup possible

**Fix**:
Create `app/api/chat/[id]/route.ts` with DELETE handler.

### Verification

- **Status**: ✅ CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: Only POST handler exists in `app/api/chat/route.ts`. Frontend calls DELETE but gets 405 Method Not Allowed. `deleteChat` data layer exists but no API route.
- **Severity**: UNCHANGED (CRITICAL)

---

## Issue #10 - Server Actions Not Persisting

**Severity**: 🔴 CRITICAL
**Files**: features/chat/actions/

**Description**:
Multiple server actions return `{ success: true }` without actually persisting to database. They have TODO comments indicating incomplete implementation.

**Affected Actions**:

- `voteOnMessage()` - votes not saved
- `updateChatVisibility()` - visibility not updated
- `deleteMessagesAfterTimestamp()` - messages not deleted

**Impact**:

- All user feedback (votes) is lost
- Visibility changes don't persist
- Edit/delete message functionality broken

### Verification

- **Status**: ✅ CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: `voteOnMessage`, `removeVote`, `deleteTrailingMessages`, `updateChatVisibility` all have TODO comments and return `{success: true}` without DB calls.
- **Severity**: UNCHANGED (CRITICAL)

---

## Issue #19 - User System Prompt Missing

**Severity**: 🔴 CRITICAL
**File**: lib/ai/prompts/

**Description**:
User-customizable system prompt feature is not implemented.

**Impact**:

- Users cannot customize AI behavior
- Settings page shows option but it does nothing

### Verification

- **Status**: ✅ CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: Chat route uses hardcoded `SYSTEM_PROMPT` constant. Settings store has systemPrompt but it's never sent to API.
- **Severity**: UNCHANGED (CRITICAL)

---

## Issue #50 - Vote Action Stub

**Severity**: 🟠 HIGH → ⚠️ DUPLICATE
**File**: features/chat/actions/vote.ts
**Status**: CLOSED - DUPLICATE of #10

### Verification

- **Status**: ⚠️ DUPLICATE of Issue #10
- **Verified**: 2025-12-22
- **Evidence**: Same issue as `voteOnMessage` stub already documented in Issue #10 (Server Actions Not Persisting).
- **Action**: MERGED into #10

**Description**:

```typescript
// TODO: Add chatData.write.upsertVote() when implementing full data layer
return { success: true }; // Returns success WITHOUT saving!
```

**Fix**:

```typescript
import { saveVoteCached } from "@/lib/data";
await saveVoteCached(input.chatId, input.messageId, input.vote, ctx);
return { success: true };
```

---

## Issue #51 - Visibility Update Stub

**Severity**: 🟠 HIGH
**File**: features/chat/actions/visibility.ts

**Description**:

```typescript
// TODO: Implement chatData.updateVisibility when data layer is complete
return { success: true }; // Returns success WITHOUT updating!
```

**Fix**:

```typescript
import { updateChatVisibilityCached } from "@/lib/data";
await updateChatVisibilityCached(input.chatId, input.visibility, ctx);
```

---

## Issue #52 - Message Deletion Stub

**Severity**: 🟡 MEDIUM
**File**: features/chat/actions/messages.ts

**Description**:

```typescript
// TODO: Implement messageData.deleteAfterTimestamp when data layer is complete
return { success: true }; // Returns success WITHOUT deleting!
```

**Fix**:

```typescript
import { deleteMessagesFromChatCached } from "@/lib/data";
await deleteMessagesFromChatCached(input.chatId, input.timestamp, ctx);
```

---

## Related Issues

- #137 (lib/data/cached/chat.ts) - TODO in production, cache ineffective
- #138 (lib/data/cached/chat.ts) - Returns null on successful guest update
