# Next.js 16.1.0 Development Guide

> **Reference for all agents**: Use these patterns when implementing features.

## Project Configuration

Current setup in `next.config.ts`:

- **Turbopack**: Default bundler (dev + build)
- **React Compiler**: Enabled for auto-memoization
- **cacheComponents**: Enabled for granular caching
- **View Transitions**: Enabled for smooth animations

## 1. Async Dynamic APIs (BREAKING CHANGE)

In Next.js 16, dynamic APIs are now **async**:

```typescript
// ❌ OLD (Next.js 15)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}

// ✅ NEW (Next.js 16)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}

// Same for searchParams
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;
}

// Same for cookies() and headers()
import { cookies, headers } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const headersList = await headers();
}
```

## 2. Cache APIs

### Route Segment Configs - REMOVED with cacheComponents

When `cacheComponents: true` is enabled, these are **NOT compatible**:

- ❌ `export const dynamic = 'force-static'`
- ❌ `export const revalidate = 0`
- ❌ `export const dynamic = 'force-dynamic'`

Instead, use these APIs:

### revalidateTag (Cache Invalidation)

```typescript
"use server";
import { revalidateTag } from "next/cache";

export async function updateChat(chatId: string) {
  await db.chat.update(chatId);
  revalidateTag(`chat-${chatId}`); // Invalidate specific cache
  revalidateTag(`chats-${userId}`); // Invalidate list cache
}
```

### updateTag (Read-Your-Writes)

```typescript
"use server";
import { updateTag } from "next/cache";

export async function sendMessage(chatId: string, message: Message) {
  await db.messages.insert(message);
  updateTag(`chat-${chatId}`); // User sees message immediately (no stale read)
}
```

### refresh (Uncached Data)

```typescript
"use server";
import { refresh } from "next/cache";

export async function markAsRead(messageId: string) {
  await db.messages.markAsRead(messageId);
  refresh(); // Refresh without cache invalidation
}
```

### 'use cache' Directive

```typescript
// Cache entire function results
"use cache";

export async function getChatHistory(userId: string) {
  return db.chat.findByUser(userId);
}

// With tags for invalidation
import { cacheTag } from "next/cache";

export async function getChat(chatId: string) {
  "use cache";
  cacheTag(`chat-${chatId}`);
  return db.chat.find(chatId);
}
```

## 3. Server Actions

```typescript
"use server";

// Always async
export async function createChat(formData: FormData) {
  const title = formData.get("title") as string;
  const chat = await db.chat.create({ title });

  revalidateTag("chats"); // Invalidate chat list cache
  return { id: chat.id };
}

// With error handling
import { AppError } from "@/lib/errors";

export async function deleteChat(chatId: string) {
  const session = await requireAuth();

  const chat = await chatData.findUnique(chatId);
  if (chat?.userId !== session.userId) {
    throw new AppError({ code: "FORBIDDEN", message: "Not authorized" });
  }

  await db.chat.delete(chatId);
  revalidateTag(`chat-${chatId}`);
  revalidateTag(`chats-${session.userId}`);
}
```

## 4. Streaming (AI SDK 5.0)

```typescript
// app/api/chat/route.ts
import { createUIMessageStream, JsonToSseTransformStream } from "ai";

export async function POST(request: Request) {
  const { messages, modelId } = await request.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Custom data parts
      writer.write({ type: "data-chatTitle", data: title, transient: true });

      // AI completion
      const result = await executeChatCompletion(messages, modelId);
      // ... stream result
    },
    onFinish: async ({ messages }) => {
      await saveMessages(messages);
    },
    onError: (error) => "An error occurred",
  });

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
```

## 5. React 19 Features

### View Transitions

```typescript
"use client";
import { useViewTransition } from "react";

export function ChatSwitcher({ chatId }: { chatId: string }) {
  const { startTransition, isPending } = useViewTransition();

  const handleSwitch = () => {
    startTransition(() => {
      router.push(`/chat/${chatId}`);
    });
  };

  return (
    <button onClick={handleSwitch} disabled={isPending}>
      {isPending ? "Loading..." : "Switch Chat"}
    </button>
  );
}
```

### useEffectEvent (Non-Reactive Events)

```typescript
"use client";
import { useEffectEvent } from "react";

export function TypingIndicator({ onTyping }: { onTyping: () => void }) {
  // Won't cause effect re-runs when onTyping changes
  const handleTyping = useEffectEvent(() => {
    onTyping();
  });

  useEffect(() => {
    const interval = setInterval(handleTyping, 1000);
    return () => clearInterval(interval);
  }, []); // No deps needed for handleTyping
}
```

## 6. File Structure Patterns

### Route Groups

```
app/
├── (auth)/           # Auth group - no /auth in URL
│   ├── login/page.tsx    # /login
│   └── register/page.tsx # /register
├── (chat)/           # Chat group - no /chat in URL
│   ├── layout.tsx        # Shared chat layout
│   ├── page.tsx          # / (root)
│   └── chat/[id]/page.tsx # /chat/:id
└── api/
    └── chat/route.ts     # /api/chat
```

### Feature Modules

```
features/
├── chat/
│   ├── index.ts          # Public exports
│   ├── types.ts          # Type definitions
│   ├── context/          # React contexts
│   ├── hooks/            # Custom hooks
│   ├── actions/          # Server actions
│   └── components/       # UI components
└── sidebar/
    └── ...
```

## 7. TypeScript Patterns

### Page Props

```typescript
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
}
```

### Server Action Returns

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createChat(): Promise<ActionResult<{ id: string }>> {
  try {
    const chat = await db.chat.create();
    return { success: true, data: { id: chat.id } };
  } catch (error) {
    return { success: false, error: "Failed to create chat" };
  }
}
```

## 8. Common Gotchas

| Issue                            | Solution                                     |
| -------------------------------- | -------------------------------------------- |
| `params` not async               | Add `await params` in component              |
| Route config error               | Remove `export const dynamic/revalidate`     |
| Build fails with cacheComponents | Use `revalidateTag` instead of route configs |
| Streaming not working            | Check `JsonToSseTransformStream` usage       |
| Type errors on cookies()         | Add `await cookies()`                        |

## 9. Security Notes

Next.js 16.1.0 includes fixes for:

- CVE-2025-55184 (High) - DoS in RSC
- CVE-2025-55183 (Medium) - Source code exposure

Always keep Next.js updated.
