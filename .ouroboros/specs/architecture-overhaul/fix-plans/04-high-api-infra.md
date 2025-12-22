# Fix Plan: High Priority API/Infrastructure Issues

**Issues**: #3, #6, #144, #215, #216, #221, #244
**Priority**: 🟠 HIGH
**Total Effort**: 6-8 hours
**Created**: 2025-12-22

---

## Summary

These issues represent API stability and infrastructure problems that can cause crashes or degraded functionality.

| Issue | Description                       | File                             | Status       |
| ----- | --------------------------------- | -------------------------------- | ------------ |
| #3    | Model selector not persisting     | Settings/Chat                    | OPEN         |
| #6    | Attachment handling incomplete    | Chat API                         | OPEN         |
| #144  | Message streaming errors          | Chat components                  | OPEN         |
| #215  | SUPABASE_URL assertion crash      | `app/api/auth/exchange/route.ts` | ✅ CONFIRMED |
| #216  | ANON_KEY assertion crash          | `app/api/auth/exchange/route.ts` | ✅ CONFIRMED |
| #221  | Type assertion without validation | `app/api/chat/route.ts`          | ✅ CONFIRMED |
| #244  | Missing guest rate limit          | `middleware.ts`                  | ✅ CONFIRMED |

---

## Issue #215 & #216: Environment Assertion Crashes

### Problem

**File**: `app/api/auth/exchange/route.ts`

Non-null assertions on environment variables cause runtime crashes if env vars are missing.

### Current (Crashes)

```typescript
const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Crashes if undefined
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Crashes if undefined
```

### Fix

```typescript
// Option A: Validate at module level with helpful error
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        "Missing Supabase configuration. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
}

// Option B: Validate in handler with graceful response
export async function POST(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("[Auth] Supabase not configured");
        return NextResponse.json(
            { error: "Authentication service unavailable" },
            { status: 503 }
        );
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, ...);
    // ... rest of handler
}
```

**Best Practice**: Create a centralized env validation module:

```typescript
// lib/config/env.ts
import { z } from "zod";

const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    // ... other required vars
});

export const env = envSchema.parse(process.env);

// Usage
import { env } from "@/lib/config/env";
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, ...);
```

**Effort**: 0.5 hours each (1 hour total)

---

## Issue #221: Type Assertion Without Validation

### Problem

**File**: `app/api/chat/route.ts`

Request body is type-asserted without validation, allowing malformed requests.

### Current (Unsafe)

```typescript
const { messages, id, modelId } = (await request.json()) as {
  messages: Message[];
  id: string;
  modelId: string;
};
```

### Fix

```typescript
import { z } from "zod";

// Define schema
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  id: z.string().uuid(),
  modelId: z.string().min(1),
  settings: z
    .object({
      systemPrompt: z.string().max(8192).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request format",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { messages, id, modelId, settings } = parsed.data;
  // ... rest of handler with validated data
}
```

**Effort**: 1 hour

---

## Issue #244: Missing Guest Rate Limit

### Problem

**File**: `middleware.ts`

The `/api/auth/guest` endpoint is not rate limited, allowing session flooding attacks.

### Current (No Protection)

```typescript
const rateLimitConfig = {
  "/api/chat": { limit: 20, window: 60 },
  "/api/auth/login": { limit: 5, window: 60 },
  // /api/auth/guest is MISSING
};
```

### Fix

```typescript
const rateLimitConfig = {
  "/api/chat": { limit: 20, window: 60 },
  "/api/auth/login": { limit: 5, window: 60 },
  "/api/auth/register": { limit: 3, window: 60 },
  "/api/auth/guest": {
    limit: 3, // Only 3 guest sessions per minute
    window: 60,
    byIp: true, // Rate limit by IP, not session
  },
  "/api/auth/exchange": {
    limit: 10,
    window: 60,
    failOpen: false, // Critical - never bypass
  },
};

// In middleware
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  for (const [pattern, config] of Object.entries(rateLimitConfig)) {
    if (path.startsWith(pattern)) {
      // Use IP for guest endpoint since no session exists yet
      const identifier = config.byIp
        ? getClientIp(request)
        : getSessionId(request) || getClientIp(request);

      const result = await checkRateLimit(identifier, config);
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}
```

**Effort**: 0.5 hours

---

## Issue #3: Model Selector Not Persisting

### Problem

Selected model is not saved to user preferences and resets on page refresh.

### Fix

**File**: `features/settings/stores/settings-store.ts`

```typescript
// Ensure modelId is in persisted state
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      modelId: "gpt-4",
      setModelId: (id: string) => set({ modelId: id }),
      // ... other settings
    }),
    {
      name: "settings-storage",
      partialize: (state) => ({
        modelId: state.modelId,
        systemPrompt: state.systemPrompt,
        // ... other persisted fields
      }),
    }
  )
);
```

**File**: `features/chat/components/model-selector.tsx`

```typescript
// Ensure selector uses store value
const { modelId, setModelId } = useSettingsStore();

// On selection change
const handleModelChange = (newModelId: string) => {
  setModelId(newModelId);
  // Optionally persist to server for cross-device sync
  if (session?.user) {
    updateUserPreferences({ modelId: newModelId });
  }
};
```

**Effort**: 1 hour

---

## Issue #6: Attachment Handling Incomplete

### Problem

File attachments are uploaded but not properly processed or stored with messages.

### Fix

**File**: `app/api/chat/route.ts`

```typescript
const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  id: z.string().uuid(),
  modelId: z.string(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        url: z.string().url(),
        size: z.number(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const { messages, attachments } = parsed.data;

  // Process attachments
  if (attachments?.length) {
    // Validate attachments exist and are accessible
    const validAttachments = await Promise.all(
      attachments.map(async (att) => {
        const exists = await verifyBlobUrl(att.url);
        return exists ? att : null;
      })
    );

    // Add attachment references to message content
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      lastMessage.attachments = validAttachments.filter(Boolean);
    }
  }

  // For multimodal models, convert attachments to content parts
  const processedMessages = messages.map((msg) => ({
    ...msg,
    content: msg.attachments
      ? formatContentWithAttachments(msg.content, msg.attachments)
      : msg.content,
  }));
}
```

**Effort**: 2 hours

---

## Issue #144: Message Streaming Errors

### Problem

Stream errors are not properly handled, leaving UI in broken state.

### Fix

**File**: `features/chat/hooks/use-chat.ts`

```typescript
const { messages, append, error, isLoading } = useChat({
  api: "/api/chat",
  onError: (error) => {
    console.error("[Chat] Stream error:", error);

    // Show user-friendly error
    toast.error(
      error.message.includes("rate limit")
        ? "Too many messages. Please wait."
        : "Failed to get response. Please try again."
    );

    // Reset loading state
    setIsStreaming(false);
  },
  onFinish: () => {
    setIsStreaming(false);
  },
});

// Add error boundary for stream
useEffect(() => {
  if (error) {
    // Recover from error state
    setMessages((prev) => prev.filter((m) => m.id !== "pending"));
  }
}, [error]);
```

**File**: `features/chat/components/message-list.tsx`

```typescript
// Handle partial/failed messages
{
  messages.map((message) => (
    <Message
      key={message.id}
      message={message}
      isError={message.id === errorMessageId}
      onRetry={() => retryMessage(message)}
    />
  ));
}
```

**Effort**: 1 hour

---

## Files Modified Summary

| File                                          | Action | Issue      |
| --------------------------------------------- | ------ | ---------- |
| `app/api/auth/exchange/route.ts`              | MODIFY | #215, #216 |
| `lib/config/env.ts`                           | CREATE | #215, #216 |
| `app/api/chat/route.ts`                       | MODIFY | #221, #6   |
| `middleware.ts`                               | MODIFY | #244       |
| `features/settings/stores/settings-store.ts`  | MODIFY | #3         |
| `features/chat/components/model-selector.tsx` | MODIFY | #3         |
| `features/chat/hooks/use-chat.ts`             | MODIFY | #144       |
| `features/chat/components/message-list.tsx`   | MODIFY | #144       |

---

## Verification Checklist

### #215 & #216 - Env Validation

- [ ] Missing env vars show helpful error
- [ ] App doesn't crash on startup
- [ ] Error logged for debugging

### #221 - Request Validation

- [ ] Invalid JSON returns 400
- [ ] Missing fields return 400 with details
- [ ] Valid requests process normally

### #244 - Guest Rate Limit

- [ ] Guest endpoint has rate limit
- [ ] Limit is per-IP
- [ ] 429 returned when exceeded

### #3 - Model Persistence

- [ ] Selected model persists across refresh
- [ ] Model syncs across tabs
- [ ] Default model works for new users

### #6 - Attachments

- [ ] Uploaded files attached to messages
- [ ] Attachments visible in chat
- [ ] Multimodal models receive images

### #144 - Stream Errors

- [ ] Error shows toast message
- [ ] UI recovers from error
- [ ] Retry button works
