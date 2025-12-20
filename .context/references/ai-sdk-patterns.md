# AI SDK Patterns Reference

## Overview

This project uses **Vercel AI SDK 5.x** for AI chat functionality. This document consolidates patterns used across the codebase.

## Package Structure

| Package             | Purpose            | Import                |
| ------------------- | ------------------ | --------------------- |
| `ai`                | Core SDK           | Server-side streaming |
| `@ai-sdk/react`     | React hooks        | Client-side state     |
| `@ai-sdk/openai`    | OpenAI provider    | Model creation        |
| `@ai-sdk/anthropic` | Anthropic provider | Model creation        |
| `@ai-sdk/google`    | Google provider    | Model creation        |

## Client-Side Patterns

### useChat Hook

Location: `features/chat/components/chat-provider.tsx`

```typescript
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const {
  messages, // Current messages
  append, // Send new message
  reload, // Regenerate last response
  stop, // Stop streaming
  status, // 'ready' | 'submitted' | 'streaming' | 'error'
  error, // Error if any
  input, // Current input value
  setInput, // Update input
  handleSubmit, // Form submit handler
} = useChat({
  id: chatId,
  initialMessages,
  sendExtraMessageFields: true,
  experimental_throttle: 100, // Adaptive throttle
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { modelId, visibility },
  }),
  onData: (data) => {
    // Process streaming data parts
  },
});
```

### Type Exports

Location: `features/chat/types.ts`

```typescript
// Re-export from AI SDK (don't redefine!)
import type { UIMessage, CreateMessage, ChatRequestOptions } from "ai";
export type { UIMessage, ChatRequestOptions };

// Alias for semantic clarity
export type ChatMessage = UIMessage;

// Status type matches SDK
export type ChatStatus = "submitted" | "streaming" | "ready" | "error";
```

## Server-Side Patterns

### Streaming with createUIMessageStream

Location: `app/api/chat/route.ts`

```typescript
import { createUIMessageStream, streamText, convertToCoreMessages } from "ai";

const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    // Stream title update (custom data part)
    writer.write({
      type: "data-chat-title",
      data: title,
    });

    // Generate AI response
    const result = streamText({
      model,
      messages: convertToCoreMessages(messages),
      system: SYSTEM_PROMPT,
    });

    // Merge text stream into data stream
    writer.merge(result.toUIMessageStream());

    // Stream usage data
    const usage = await result.usage;
    writer.write({
      type: "data-usage",
      data: usage,
    });
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### Provider Initialization

Location: `lib/ai/providers.ts`

```typescript
import { createOpenAI } from "@ai-sdk/openai";

// Lazy initialization (avoids errors when env vars missing)
export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return createOpenAI({ apiKey });
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ ChatProvider │    │ useChatHelpers│   │ useDataStream │       │
│  │   useChat()  │───▶│   .status    │   │   .dataStream │       │
│  └──────────────┘    │   .messages  │   └──────────────┘        │
│         │            │   .append    │          ▲                 │
│         │            └──────────────┘          │                 │
│         │                                      │                 │
│         │ POST /api/chat ─────────────────────┼────────────────▶│
│         │                                      │   SSE stream    │
└─────────┼──────────────────────────────────────┼─────────────────┘
          │                                      │
┌─────────▼──────────────────────────────────────▼─────────────────┐
│                        SERVER                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ createUIMessageStream()                                   │   │
│  │   ├── writer.write({ type: 'data-chat-title', data })    │   │
│  │   ├── streamText() → writer.merge(toUIMessageStream())   │   │
│  │   └── writer.write({ type: 'data-usage', data })         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. USE AI SDK Types (Don't Reinvent)

```typescript
// ✅ CORRECT
import type { UIMessage } from "ai";
export type ChatMessage = UIMessage;

// ❌ WRONG
interface ChatMessage {
  id: string;
  role: string;
  content: string;
}
```

### 2. Expose useChat Directly

```typescript
// ✅ CORRECT - Expose AI SDK's useChat return
const chatHelpers = useChat({ ... });
return <Context.Provider value={chatHelpers}>

// ❌ WRONG - Re-wrap with custom interface
const state = { messages: chatHelpers.messages, ... };
```

### 3. Use createUIMessageStream for Rich Streaming

```typescript
// ✅ CORRECT - Rich streaming with data parts
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    writer.merge(result.toUIMessageStream());
  },
});

// ❌ WRONG - Simple text streaming
return result.toTextStreamResponse();
```

## Version Compatibility

| Package        | Version | Notes           |
| -------------- | ------- | --------------- |
| ai             | 5.0.x   | Core SDK        |
| @ai-sdk/react  | 2.0.x   | React bindings  |
| @ai-sdk/openai | 2.0.x   | OpenAI provider |

## References

- [AI SDK Docs](https://sdk.vercel.ai/docs)
- Spec: `.ouroboros/specs/architecture-overhaul/06-chat-system-optimal-design.md`
