# Fix Plan: Critical Data Persistence Issues

**Issues**: #1, #9, #10
**Priority**: 🔴 CRITICAL
**Total Effort**: 5-8 hours
**Created**: 2025-12-22

---

## Summary

These three issues are interconnected and represent the **most critical bugs** in the application. Chat data is streamed to users but NEVER persisted to the database, making the core chat feature essentially broken.

| Issue | Description                                        | Status       |
| ----- | -------------------------------------------------- | ------------ |
| #1    | Chat persistence - `onFinish` missing `saveChat()` | ✅ CONFIRMED |
| #9    | DELETE /api/chat endpoint missing                  | ✅ CONFIRMED |
| #10   | Server Actions return success without persisting   | ✅ CONFIRMED |

---

## Issue #1: Chat Persistence Missing

### Problem

**File**: `app/api/chat/route.ts`

The chat API's `onFinish` callback only logs token usage but **never calls `saveChat()`**. Messages are streamed to the client but lost on page refresh.

**Current Code**:

```typescript
onFinish: async ({ response }) => {
    // Token usage logged but saveChat() is MISSING
    console.info("[Chat API] Token usage:", {...});
}
```

### Impact

- ❌ All chat messages lost on page refresh
- ❌ Chat history always empty
- ❌ Core functionality completely broken

### Fix Implementation

**Step 1**: Import required data layer functions

```typescript
// app/api/chat/route.ts
import {
  getChatByIdCached,
  saveChatCached,
  createChatCached,
} from "@/lib/data";
```

**Step 2**: Update `onFinish` callback

```typescript
onFinish: async ({ response }) => {
  try {
    // Check if chat exists
    const existingChat = await getChatByIdCached(chatId, ctx);

    if (existingChat) {
      // Append messages to existing chat
      await saveChatCached(
        {
          id: chatId,
          userId,
          messages: response.messages,
        },
        ctx
      );
    } else {
      // Create new chat
      await createChatCached(
        {
          id: chatId,
          userId,
          title: messages[0]?.content?.slice(0, 100) || "New Chat",
          messages: response.messages,
        },
        ctx
      );
    }

    console.info("[Chat API] Chat saved:", {
      chatId,
      messageCount: response.messages.length,
    });
  } catch (error) {
    console.error("[Chat API] Failed to save chat:", error);
    // Don't throw - stream already complete, log for monitoring
  }
};
```

**Step 3**: Handle message accumulation

```typescript
// Ensure we save ALL messages, not just new ones
const allMessages = [...(existingChat?.messages ?? []), ...response.messages];
await saveChatCached(
  {
    id: chatId,
    userId,
    messages: allMessages,
  },
  ctx
);
```

### Testing

```bash
# 1. Send a message
# 2. Refresh the page
# 3. Chat should persist in history
# 4. Check Redis/DB for saved data
```

---

## Issue #9: DELETE /api/chat Endpoint Missing

### Problem

**File**: `app/api/chat/` (missing route)

No endpoint exists to delete individual chats. Frontend calls DELETE but gets 405 Method Not Allowed.

### Impact

- ❌ Users cannot delete chats
- ❌ Chat history accumulates forever
- ❌ No GDPR-compliant data deletion

### Fix Implementation

**Step 1**: Create new route file

**File**: `app/api/chat/[id]/route.ts`

```typescript
/**
 * Chat Delete API
 * @module app/api/chat/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteChatCached, getChatByIdCached } from "@/lib/data";
import { AppError, ErrorCodes } from "@/lib/errors";

type RouteParams = {
  params: { id: string };
};

/**
 * DELETE /api/chat/[id]
 * Delete a specific chat by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: chatId } = params;

    // 2. Validate chat ID
    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json({ error: "Invalid chat ID" }, { status: 400 });
    }

    // 3. Verify ownership
    const ctx = { userId: session.user.id };
    const chat = await getChatByIdCached(chatId, ctx);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this chat" },
        { status: 403 }
      );
    }

    // 4. Delete chat
    await deleteChatCached(chatId, ctx);

    // 5. Return success
    return NextResponse.json(
      { success: true, deletedId: chatId },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Chat API] Delete error:", error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/[id]
 * Get a specific chat by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: chatId } = params;
    const ctx = { userId: session.user.id };
    const chat = await getChatByIdCached(chatId, ctx);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Check ownership or public visibility
    if (chat.userId !== session.user.id && chat.visibility !== "public") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("[Chat API] Get error:", error);
    return NextResponse.json({ error: "Failed to get chat" }, { status: 500 });
  }
}
```

### Testing

```bash
# Test delete
curl -X DELETE http://localhost:3000/api/chat/[chat-id] \
  -H "Cookie: session=..."

# Expected: { "success": true, "deletedId": "..." }
```

---

## Issue #10: Server Actions Not Persisting

### Problem

**Files**: `features/chat/actions/`

Multiple server actions return `{ success: true }` without actually persisting to database. They have TODO comments indicating incomplete implementation.

**Affected Actions**:

- `voteOnMessage()` - votes not saved
- `updateChatVisibility()` - visibility not updated
- `deleteMessagesAfterTimestamp()` - messages not deleted

### Impact

- ❌ All user feedback (votes) lost
- ❌ Visibility changes don't persist
- ❌ Edit/delete message functionality broken

### Fix Implementation

#### Fix 1: Vote Action

**File**: `features/chat/actions/vote.ts`

```typescript
"use server";

import { getSession } from "@/lib/auth";
import { saveVoteCached, removeVoteCached } from "@/lib/data";
import { z } from "zod";

const VoteSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  vote: z.enum(["up", "down"]),
});

export async function voteOnMessage(input: z.infer<typeof VoteSchema>) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = VoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const ctx = { userId: session.user.id };
    await saveVoteCached(
      {
        chatId: parsed.data.chatId,
        messageId: parsed.data.messageId,
        vote: parsed.data.vote,
        userId: session.user.id,
      },
      ctx
    );

    return { success: true };
  } catch (error) {
    console.error("[Vote Action] Error:", error);
    return { success: false, error: "Failed to save vote" };
  }
}

export async function removeVote(input: { chatId: string; messageId: string }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const ctx = { userId: session.user.id };
    await removeVoteCached(input.chatId, input.messageId, session.user.id, ctx);
    return { success: true };
  } catch (error) {
    console.error("[Vote Action] Remove error:", error);
    return { success: false, error: "Failed to remove vote" };
  }
}
```

#### Fix 2: Visibility Action

**File**: `features/chat/actions/visibility.ts`

```typescript
"use server";

import { getSession } from "@/lib/auth";
import { updateChatVisibilityCached, getChatByIdCached } from "@/lib/data";
import { z } from "zod";

const VisibilitySchema = z.object({
  chatId: z.string().uuid(),
  visibility: z.enum(["private", "public"]),
});

export async function updateChatVisibility(
  input: z.infer<typeof VisibilitySchema>
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = VisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const ctx = { userId: session.user.id };

    // Verify ownership
    const chat = await getChatByIdCached(parsed.data.chatId, ctx);
    if (!chat || chat.userId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    await updateChatVisibilityCached(
      parsed.data.chatId,
      parsed.data.visibility,
      ctx
    );

    return { success: true };
  } catch (error) {
    console.error("[Visibility Action] Error:", error);
    return { success: false, error: "Failed to update visibility" };
  }
}
```

#### Fix 3: Message Deletion Action

**File**: `features/chat/actions/messages.ts`

```typescript
"use server";

import { getSession } from "@/lib/auth";
import {
  deleteMessagesAfterTimestampCached,
  getChatByIdCached,
} from "@/lib/data";
import { z } from "zod";

const DeleteMessagesSchema = z.object({
  chatId: z.string().uuid(),
  timestamp: z.string().datetime(),
});

export async function deleteTrailingMessages(
  input: z.infer<typeof DeleteMessagesSchema>
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = DeleteMessagesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  try {
    const ctx = { userId: session.user.id };

    // Verify ownership
    const chat = await getChatByIdCached(parsed.data.chatId, ctx);
    if (!chat || chat.userId !== session.user.id) {
      return { success: false, error: "Not authorized" };
    }

    const deletedCount = await deleteMessagesAfterTimestampCached(
      parsed.data.chatId,
      new Date(parsed.data.timestamp),
      ctx
    );

    return { success: true, deletedCount };
  } catch (error) {
    console.error("[Delete Messages Action] Error:", error);
    return { success: false, error: "Failed to delete messages" };
  }
}
```

### Testing

```typescript
// Test vote persistence
const result = await voteOnMessage({
  chatId: "...",
  messageId: "...",
  vote: "up",
});
// Refresh page - vote should persist

// Test visibility
await updateChatVisibility({ chatId: "...", visibility: "public" });
// Check DB - visibility should be updated

// Test message deletion
await deleteTrailingMessages({ chatId: "...", timestamp: "..." });
// Check DB - messages after timestamp should be gone
```

---

## Files Modified Summary

| File                                  | Action | Issue |
| ------------------------------------- | ------ | ----- |
| `app/api/chat/route.ts`               | MODIFY | #1    |
| `app/api/chat/[id]/route.ts`          | CREATE | #9    |
| `features/chat/actions/vote.ts`       | MODIFY | #10   |
| `features/chat/actions/visibility.ts` | MODIFY | #10   |
| `features/chat/actions/messages.ts`   | MODIFY | #10   |

---

## Verification Checklist

- [ ] Send message → refreshes → message persists
- [ ] Chat appears in history sidebar
- [ ] Delete chat → removed from history
- [ ] Vote on message → refresh → vote persists
- [ ] Change visibility → refresh → visibility persists
- [ ] Delete trailing messages → messages removed
- [ ] Error handling returns proper messages
- [ ] Unauthorized access rejected with 401/403
