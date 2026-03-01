# AI Migration Guide

> Copy manifest for the 31 AI element files, wrapper mapping, import boundary rules, and SDK integration patterns.

---

## Overview

The AI layer consists of 31 read-only UI primitive files (4,881 LOC, ~440 exports) that must be copied verbatim from `oldapp/components/elements/` to `components/ai-elements/`. Zero logic modifications allowed — only import path rewrites.

**Copy task:** P00-T12
**Verification:** SHA-256 checksum comparison post-import-rewrite

---

## Copy Manifest

| # | Source File | Target File | LOC | Exports |
|---|------------|-------------|-----|---------|
| 1 | `oldapp/components/elements/artifact.tsx` | `components/ai-elements/artifact.tsx` | 128 | 16 |
| 2 | `oldapp/components/elements/canvas.tsx` | `components/ai-elements/canvas.tsx` | 20 | 1 |
| 3 | `oldapp/components/elements/chain-of-thought.tsx` | `components/ai-elements/chain-of-thought.tsx` | 211 | 14 |
| 4 | `oldapp/components/elements/checkpoint.tsx` | `components/ai-elements/checkpoint.tsx` | 64 | 6 |
| 5 | `oldapp/components/elements/code-block.tsx` | `components/ai-elements/code-block.tsx` | 182 | 4 |
| 6 | `oldapp/components/elements/confirmation.tsx` | `components/ai-elements/confirmation.tsx` | 158 | 14 |
| 7 | `oldapp/components/elements/connection.tsx` | `components/ai-elements/connection.tsx` | 26 | 1 |
| 8 | `oldapp/components/elements/context.tsx` | `components/ai-elements/context.tsx` | 379 | 20 |
| 9 | `oldapp/components/elements/controls.tsx` | `components/ai-elements/controls.tsx` | 15 | 2 |
| 10 | `oldapp/components/elements/conversation.tsx` | `components/ai-elements/conversation.tsx` | 92 | 8 |
| 11 | `oldapp/components/elements/edge.tsx` | `components/ai-elements/edge.tsx` | 132 | 1 |
| 12 | `oldapp/components/elements/image.tsx` | `components/ai-elements/image.tsx` | 107 | 2 |
| 13 | `oldapp/components/elements/inline-citation.tsx` | `components/ai-elements/inline-citation.tsx` | 258 | 28 |
| 14 | `oldapp/components/elements/lazy.tsx` | `components/ai-elements/lazy.tsx` | 100 | 9 |
| 15 | `oldapp/components/elements/loader.tsx` | `components/ai-elements/loader.tsx` | 92 | 2 |
| 16 | `oldapp/components/elements/message.tsx` | `components/ai-elements/message.tsx` | 394 | 28 |
| 17 | `oldapp/components/elements/model-selector.tsx` | `components/ai-elements/model-selector.tsx` | 177 | 28 |
| 18 | `oldapp/components/elements/node.tsx` | `components/ai-elements/node.tsx` | 60 | 14 |
| 19 | `oldapp/components/elements/open-in-chat.tsx` | `components/ai-elements/open-in-chat.tsx` | 339 | 24 |
| 20 | `oldapp/components/elements/panel.tsx` | `components/ai-elements/panel.tsx` | 13 | 1 |
| 21 | `oldapp/components/elements/plan.tsx` | `components/ai-elements/plan.tsx` | 120 | 16 |
| 22 | `oldapp/components/elements/prompt-input.tsx` | `components/ai-elements/prompt-input.tsx` | 1275 | 81 |
| 23 | `oldapp/components/elements/queue.tsx` | `components/ai-elements/queue.tsx` | 245 | 33 |
| 24 | `oldapp/components/elements/reasoning.tsx` | `components/ai-elements/reasoning.tsx` | 183 | 7 |
| 25 | `oldapp/components/elements/shimmer.tsx` | `components/ai-elements/shimmer.tsx` | 58 | 2 |
| 26 | `oldapp/components/elements/sources.tsx` | `components/ai-elements/sources.tsx` | 68 | 8 |
| 27 | `oldapp/components/elements/suggestion.tsx` | `components/ai-elements/suggestion.tsx` | 56 | 4 |
| 28 | `oldapp/components/elements/task.tsx` | `components/ai-elements/task.tsx` | 80 | 10 |
| 29 | `oldapp/components/elements/tool.tsx` | `components/ai-elements/tool.tsx` | 156 | 10 |
| 30 | `oldapp/components/elements/toolbar.tsx` | `components/ai-elements/toolbar.tsx` | 14 | 1 |
| 31 | `oldapp/components/elements/web-preview.tsx` | `components/ai-elements/web-preview.tsx` | 243 | 13 |

**Total:** 31 files · 4,881 LOC · ~440 exports

---

## Import Path Rewrites

All internal imports must be rewritten to match the new project structure:

| Old Path Pattern | New Path Pattern |
|-----------------|-----------------|
| `@/components/ui/*` | `@/components/ui/*` (unchanged) |
| `@/lib/utils/index` | `@/lib/utils` |
| `@/lib/utils/lazy` | `@/lib/utils/lazy` (unchanged) |
| `@/lib/utils/logger` | `@/lib/utils/logger` (unchanged) |
| `@/lib/types/ai-sdk` | `@/lib/types/ai-sdk` (unchanged) |

Most imports remain identical. Only `@/lib/utils/index` may need simplification to `@/lib/utils`.

---

## Wrapper Mapping

AI primitives are global in `components/ai-elements/`. Domain-specific wrappers live in feature directories:

| Wrapper | Location | Wraps | Purpose |
|---------|----------|-------|---------|
| Chat completion | `features/chat/ai/chat-completion.ts` | AI SDK `streamText` | Domain-specific system prompt, tools, streaming config |
| Provider registry | `features/chat/ai/provider-registry.ts` | AI SDK `createProviderRegistry` | Multi-model provider setup |
| Provider wrapper | `features/chat/ai/provider-wrapper.ts` | Registry lookup | Rate limiting, usage tracking |
| Model discovery | `features/chat/ai/model-discovery.ts` | Registry + catalog | UI model list with metadata |
| Artifact handlers | `features/artifacts/ai/handlers/` | AI SDK `streamObject` | Per-type artifact creation/update |
| Document tools | `features/artifacts/ai/tools/` | AI SDK `tool()` | createDocument, updateDocument, requestSuggestions |

---

## Import Boundary Rules

```
components/ai-elements/  → CAN import from: @/components/ui/, @/lib/utils/, @/lib/types/, external packages
                          → CANNOT import from: features/*, app/*

features/chat/ai/         → CAN import from: @/lib/ai/, @/lib/types/, external packages
                          → CANNOT import from: features/artifacts/*, components/ai-elements/*

features/artifacts/ai/    → CAN import from: @/lib/ai/, @/lib/types/, external packages
                          → CANNOT import from: features/chat/*, components/ai-elements/*

features/*/components/    → CAN import from: components/ai-elements/ (consumer)
                          → CANNOT import from: other features/*
```

**Enforcement:** P07-T10 runs an import boundary script that validates these rules at build time.

---

## SDK Integration Patterns

### Streaming Chat (Vercel AI SDK)

```typescript
// Server: features/chat/ai/chat-completion.ts
import { streamText } from 'ai';
import { registry } from './provider-registry';

export async function streamChatCompletion(modelId: string, messages: Message[], tools: Tools) {
  return streamText({
    model: registry.languageModel(modelId),
    system: getSystemPrompt(),
    messages,
    tools,
    maxSteps: 5,
    abortSignal: AbortSignal.timeout(55_000),
  });
}
```

### Client Chat Hook (Vercel AI SDK)

```typescript
// Client: features/chat/hooks/use-chat-handler.ts
import { useChat } from '@ai-sdk/react';

const { messages, input, handleSubmit, stop, append, setMessages } = useChat({
  api: '/api/chat',
  id: chatId,
  body: { model: selectedModel },
  initialMessages,
  onError: (error) => toast.error(error.message),
});
```

### Artifact Streaming (Vercel AI SDK)

```typescript
// Server: features/artifacts/ai/handlers/text-handler.ts
import { streamObject } from 'ai';

export async function handleTextArtifact(prompt: string, modelId: string) {
  return streamObject({
    model: registry.languageModel(modelId),
    schema: textArtifactSchema,
    prompt,
  });
}
```

### DataStream Protocol

```typescript
// Server action writes custom data to stream
dataStream.writeData({ type: 'artifact-delta', content: delta });
dataStream.writeData({ type: 'data-usage', usage: { daily: 45, max: 50 } });

// Client reads via DataStreamHandler
useEffect(() => {
  for (const part of streamData) {
    if (part.type === 'artifact-delta') handleDelta(part.content);
    if (part.type === 'data-usage') handleUsage(part.usage);
  }
}, [streamData]);
```

---

## External Package Dependencies

These packages are required by the AI elements and must be in `package.json`:

| Package | Used By |
|---------|---------|
| `@xyflow/react` | canvas, connection, controls, edge, node, panel, toolbar |
| `lucide-react` | 17 elements |
| `@radix-ui/react-use-controllable-state` | chain-of-thought, reasoning |
| `shiki` | code-block |
| `dompurify` | code-block |
| `streamdown` | message, reasoning |
| `motion/react` | shimmer |
| `ai` | context, image, message, prompt-input, tool |
| `tokenlens` | context |
| `nanoid` | prompt-input |
| `use-stick-to-bottom` | conversation |

---

## Content Protection Protocol

1. Copy each file byte-for-byte from source
2. Apply import path rewrites (only `from` strings change)
3. Generate SHA-256 hash of each file post-rewrite
4. Store hashes in `components/ai-elements/.checksums.json`
5. Gate task P00-T17 verifies all 31 hashes match
6. No logic modifications permitted — any functional change requires explicit approval and deviation log
