# AI SDK v5 Testing Guide — Documentation Report

> Source: https://v5.ai-sdk.dev/docs/ai-sdk-core/testing
> Fetched: 2026-03-04
> Purpose: Guide for refactoring project test mocks to use official AI SDK test utilities

---

## Overview

The AI SDK provides **official mock providers and test helpers** in `ai/test`:

| Export | Purpose |
|--------|---------|
| `MockLanguageModelV2` | Mock language model implementing `LanguageModelV2` spec |
| `MockEmbeddingModelV2` | Mock embedding model implementing `EmbeddingModelV2` spec |
| `mockId` | Provides incrementing integer IDs |
| `mockValues` | Iterates over array of values; returns last when exhausted |
| `simulateReadableStream` | Creates ReadableStream with configurable delays |

**Import:** `import { MockLanguageModelV2 } from 'ai/test'`  
**Import:** `import { simulateReadableStream } from 'ai'`

---

## Key Patterns

### 1. generateText (Non-Streaming)

```typescript
import { generateText } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';

const result = await generateText({
  model: new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: 'text', text: 'Hello, world!' }],
      warnings: [],
    }),
  }),
  prompt: 'Hello, test!',
});
```

### 2. streamText (Streaming)

```typescript
import { streamText, simulateReadableStream } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';

const result = streamText({
  model: new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: 'Hello' },
          { type: 'text-delta', id: 'text-1', delta: ', ' },
          { type: 'text-delta', id: 'text-1', delta: 'world!' },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
          },
        ],
      }),
    }),
  }),
  prompt: 'Hello, test!',
});
```

### 3. generateObject (Structured Output)

```typescript
import { generateObject } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';
import { z } from 'zod';

const result = await generateObject({
  model: new MockLanguageModelV2({
    doGenerate: async () => ({
      finishReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      content: [{ type: 'text', text: '{"content":"Hello, world!"}' }],
      warnings: [],
    }),
  }),
  schema: z.object({ content: z.string() }),
  prompt: 'Hello, test!',
});
```

### 4. streamObject (Streaming Structured Output)

```typescript
import { streamObject, simulateReadableStream } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';
import { z } from 'zod';

const result = streamObject({
  model: new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: '{ ' },
          { type: 'text-delta', id: 'text-1', delta: '"content": ' },
          { type: 'text-delta', id: 'text-1', delta: '"Hello, ' },
          { type: 'text-delta', id: 'text-1', delta: 'world' },
          { type: 'text-delta', id: 'text-1', delta: '!"' },
          { type: 'text-delta', id: 'text-1', delta: ' }' },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
          },
        ],
      }),
    }),
  }),
  schema: z.object({ content: z.string() }),
  prompt: 'Hello, test!',
});
```

### 5. Simulate UI Message Stream Responses

For testing UI streaming (e.g., in route handlers):

```typescript
import { simulateReadableStream } from 'ai';

export async function POST(req: Request) {
  return new Response(
    simulateReadableStream({
      initialDelayInMs: 1000,
      chunkDelayInMs: 300,
      chunks: [
        `data: {"type":"start","messageId":"msg-123"}\n\n`,
        `data: {"type":"text-start","id":"text-1"}\n\n`,
        `data: {"type":"text-delta","id":"text-1","delta":"This"}\n\n`,
        `data: {"type":"text-delta","id":"text-1","delta":" is an"}\n\n`,
        `data: {"type":"text-delta","id":"text-1","delta":" example."}\n\n`,
        `data: {"type":"text-end","id":"text-1"}\n\n`,
        `data: {"type":"finish"}\n\n`,
        `data: [DONE]\n\n`,
      ],
    }).pipeThrough(new TextEncoderStream()),
    { headers: { 'Content-Type': 'text/event-stream' } }
  );
}
```

---

## simulateReadableStream API

```typescript
import { simulateReadableStream } from 'ai';

const stream = simulateReadableStream({
  chunks: T[],              // Array of values to emit
  initialDelayInMs?: number | null,  // Delay before first chunk (default: 0, null = no delay)
  chunkDelayInMs?: number | null,    // Delay between chunks (default: 0, null = no delay)
});
// Returns ReadableStream<T>
```

---

## MockLanguageModelV2 API

```typescript
import { MockLanguageModelV2 } from 'ai/test';

new MockLanguageModelV2({
  // For non-streaming (generateText, generateObject):
  doGenerate: async (options) => ({
    finishReason: 'stop',
    usage: { inputTokens: number, outputTokens: number, totalTokens: number },
    content: [{ type: 'text', text: string }],
    warnings: [],
  }),

  // For streaming (streamText, streamObject):
  doStream: async (options) => ({
    stream: ReadableStream, // typically from simulateReadableStream
  }),
});
```

---

## Additional Test Utilities

### mockId

Provides incrementing integer IDs for deterministic test output.

### mockValues

```typescript
import { mockValues } from 'ai/test';

const values = mockValues(['a', 'b', 'c']);
values(); // 'a'
values(); // 'b'
values(); // 'c'
values(); // 'c' (repeats last)
```

---

## Application to This Project

### Current State (P7-T08)
The project currently has custom mock implementations in:
- `tests/mocks/ai.ts` — Custom `createMockLanguageModel` implementing LanguageModelV2 manually
- `tests/utils/stream.ts` — Custom `collectStreamEvents` SSE parser + `buildSseStream`

### What Should Change
Replace custom mocks with official AI SDK test utilities:

1. **`tests/mocks/ai.ts`** → Replace `createMockLanguageModel` with `MockLanguageModelV2` from `ai/test`
2. **`tests/utils/stream.ts`** → Use `simulateReadableStream` from `ai` for stream creation
3. **Integration tests** → Update to use `MockLanguageModelV2` + `simulateReadableStream`
4. **E2E mock routes** → Use `simulateReadableStream` for UI Message Stream simulation

### Benefits
- **Less code to maintain** — official mocks track SDK API changes
- **Better type safety** — official mocks are always aligned with SDK types
- **Correct V2 interface** — no risk of custom mock drift from real API
- **simulateReadableStream** delays are useful for testing timing-sensitive behavior

### Stream Chunk Protocol (V2)
The correct streaming chunk types for MockLanguageModelV2.doStream:
- `{ type: 'text-start', id: string }`
- `{ type: 'text-delta', id: string, delta: string }`
- `{ type: 'text-end', id: string }`
- `{ type: 'finish', finishReason: string, logprobs: undefined, usage: { inputTokens, outputTokens, totalTokens } }`

### UI Message Stream Protocol (for route testing)
SSE format with `data:` prefix and double newline:
- `data: {"type":"start","messageId":"msg-123"}\n\n`
- `data: {"type":"text-start","id":"text-1"}\n\n`
- `data: {"type":"text-delta","id":"text-1","delta":"..."}\n\n`
- `data: {"type":"text-end","id":"text-1"}\n\n`
- `data: {"type":"finish"}\n\n`
- `data: [DONE]\n\n`
