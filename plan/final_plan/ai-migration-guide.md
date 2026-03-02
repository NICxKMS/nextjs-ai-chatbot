> **Updated per redesign audit (2026-03-01)**

# AI Migration Guide

> AI integration patterns, tool definitions, streaming architecture, handler registry, and SDK integration — updated with redesign naming and patterns.

---

## Overview

The AI layer consists of two parts:

1. **Shared AI infrastructure** (`lib/ai/`) — provider registry, model catalog, prompts, tool enablement, handler registry, title generation
2. **Feature-specific AI code** — tools in `features/chat/lib/tools/`, handlers in `features/artifacts/handlers/`

No AI element files are copied verbatim. All AI integration uses the Vercel AI SDK directly with the patterns documented below.

---

## Tool Definitions

All tools use **"artifact"** naming. No "document" anywhere.

| Tool | Purpose | Parameters | Handler Location |
|------|---------|------------|------------------|
| `getWeather` | Show weather widget | `{ latitude, longitude }` | `features/chat/lib/tools/weather.ts` (self-contained) |
| `createArtifact` | Create new text/code/sheet artifact | `{ title, kind }` | Handler via registry → `features/artifacts/handlers/` |
| `updateArtifact` | Modify existing artifact | `{ id, description }` | Handler via registry → `features/artifacts/handlers/` |
| `requestSuggestions` | Suggest inline edits for text artifacts | `{ artifactId }` | `features/chat/lib/tools/request-suggestions.ts` |

### createArtifact Tool

```typescript
// features/chat/lib/tools/create-artifact.ts
export function createArtifactTool({ session, ChatStream, chatId }) {
  return {
    description: 'Create an artifact for substantial, self-contained content (>10 lines).',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(['text', 'code', 'sheet']),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID()
      const handler = getArtifactHandler(kind)  // From registry (dependency inversion)

      // Signal client to open artifact panel
      ChatStream.writeData({ type: 'artifact-kind', content: kind })
      ChatStream.writeData({ type: 'artifact-id', content: id })
      ChatStream.writeData({ type: 'artifact-title', content: title })
      ChatStream.writeData({ type: 'artifact-clear', content: '' })

      // Delegate content generation to registered handler
      const content = await handler.create({ id, title, kind, ChatStream, session, chatId })

      // Persist
      await saveArtifactVersion({ id, title, kind, content, userId: session.userId, chatId })
      ChatStream.writeData({ type: 'artifact-finish', content: '' })

      return { id, title, kind, content: `Created artifact: "${title}"` }
    },
  }
}
```

### updateArtifact Tool

Same factory pattern. Parameters: `{ id, description }`. Loads artifact via `getArtifactById(id)`, resolves handler via `getArtifactHandler(artifact.kind)`, writes `artifact-clear` → delegates to `handler.update()` → `saveArtifactVersion()` → `artifact-finish`.

---

## Handler Registry Pattern

### Registry (`lib/ai/artifact-handlers.ts`)

```typescript
// Dependency inversion: tools depend on registry interface, not concrete handlers
const handlers = new Map<ArtifactKind, ArtifactHandler>()

export function registerArtifactHandler(kind: ArtifactKind, handler: ArtifactHandler) {
  handlers.set(kind, handler)
}

export function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
  const handler = handlers.get(kind)
  if (!handler) throw new Error(`No handler registered for artifact kind: ${kind}`)
  return handler
}
```

### Handler Registration (Side-Effect Import)

```typescript
// features/artifacts/handlers/index.ts — imported for side-effect in route handler
import { registerArtifactHandler } from '@/lib/ai/artifact-handlers'
import { textHandler } from './text-handler'
import { codeHandler } from './code-handler'
import { sheetHandler } from './sheet-handler'
import { imageHandler } from './image-handler'

registerArtifactHandler('text', textHandler)
registerArtifactHandler('code', codeHandler)
registerArtifactHandler('sheet', sheetHandler)
registerArtifactHandler('image', imageHandler)
```

### Handler Implementations

| Handler | File | AI Method | Delta Type | Accumulation |
|---------|------|-----------|------------|--------------|
| Text | `text-handler.ts` | `streamText` | `artifact-textDelta` | **Append** (`content += delta`) |
| Code | `code-handler.ts` | `streamObject` | `artifact-codeDelta` | **Replace** (`content = delta`) |
| Sheet | `sheet-handler.ts` | `streamObject` | `artifact-sheetDelta` | **Replace** (`content = delta`) |
| Image | `image-handler.ts` | — | `artifact-imageDelta` | **Replace** (`content = delta`) |

---

## Streaming Architecture

### Stream Part Types

All custom data stream parts use **"artifact-*"** prefix. No "data-document-*" prefix.

#### Artifact Lifecycle Parts

| Part Type | Content | Purpose |
|-----------|---------|---------|
| `artifact-id` | `string` (UUID) | Set artifact ID, transition to streaming |
| `artifact-title` | `string` | Set artifact title |
| `artifact-kind` | `ArtifactKind` | Set artifact kind (text/code/sheet) |
| `artifact-clear` | `''` | Clear content, signal new generation |
| `artifact-finish` | `''` | Mark generation complete, status → idle |

#### Content Delta Parts

| Part Type | Accumulation | Used By |
|-----------|--------------|---------|
| `artifact-textDelta` | **Append** | Text handler |
| `artifact-codeDelta` | **Replace** | Code handler |
| `artifact-sheetDelta` | **Replace** | Sheet handler |
| `artifact-imageDelta` | **Replace** | Image (from code execution) |

#### Other Parts

| Part Type | Purpose |
|-----------|---------|
| `artifact-suggestion` | Inline edit suggestion |
| `chat-title` | Chat title (AWAITED server-side before stream close) |

#### Removed Parts

| Removed | Reason |
|---------|--------|
| `data-usage` | Credit/quota system removed entirely |
| `data-appendMessage` | Not needed — `useChat` manages messages natively |

---

## StreamBridge Pattern

### Flow

```
SSE delta arrives
  → useChat.onData callback
    → artifact-* parts: ChatStreamDispatch.setChatStream([part])
    → chat-title: PendingChats.updateTitle()
  → RAF batches deltas in ChatStreamProvider (split context)
  → StreamBridge effect fires
    → processStreamDelta(delta, currentArtifact)  // Pure function
    → artifactStore.setState(newArtifact)          // useSyncExternalStore
  → ArtifactPanel re-renders (only subscribers)
```

### StreamBridge — Thin Bridge (~20 lines)

```typescript
// features/chat/components/stream-bridge.tsx
export function StreamBridge({ id }: { id: string }) {
  const { ChatStream } = useChatStream()
  const lastProcessedRef = useRef(-1)

  useEffect(() => {
    const newDeltas = ChatStream.slice(lastProcessedRef.current + 1)
    lastProcessedRef.current = ChatStream.length - 1

    for (const delta of newDeltas) {
      const current = artifactStore.getSnapshot()
      const { artifact } = processStreamDelta(delta, current)
      artifactStore.setState(artifact)
    }
  }, [ChatStream, id])

  return null
}
```

### processStreamDelta — Pure Testable Function

```typescript
// features/chat/lib/process-stream-deltas.ts
export function processStreamDelta(delta: DataPart, current: UIArtifact): { artifact: UIArtifact } {
  switch (delta.type) {
    case 'artifact-id':
      return { artifact: { ...current, artifactId: delta.content, status: 'streaming', isVisible: true } }
    case 'artifact-title':
      return { artifact: { ...current, title: delta.content } }
    case 'artifact-kind':
      return { artifact: { ...current, kind: delta.content as ArtifactKind } }
    case 'artifact-clear':
      return { artifact: { ...current, content: '', status: 'streaming' } }
    case 'artifact-finish':
      return { artifact: { ...current, status: 'idle' } }
    case 'artifact-textDelta':
      return { artifact: { ...current, content: current.content + delta.content } }
    case 'artifact-codeDelta':
    case 'artifact-sheetDelta':
    case 'artifact-imageDelta':
      return { artifact: { ...current, content: delta.content } }
    default:
      return { artifact: current }
  }
}
```

---

## ChatStreamProvider — Split Context with RAF Batching

```typescript
// features/chat/components/chat-stream-provider.tsx
// Split into StateCtx (read) and DispatchCtx (write) to minimize re-renders
// RAF batching coalesces ~200 SSE deltas/sec to ~60 React updates/sec

export function useChatStream()          // Read — used by StreamBridge
export function useChatStreamDispatch()  // Write — used by useChatSession.onData
```

Benefits:
- `useChatSession.onData` uses `useChatStreamDispatch()` → **no re-render** on state change
- `StreamBridge` uses `useChatStream()` → re-renders on new deltas (necessary)
- RAF batching prevents high-frequency cascades

---

## SDK Integration Patterns

### Server: Chat Route Handler

```typescript
// app/api/chat/route.ts
import { createUIMessageStream, streamText } from 'ai'
import '@/features/artifacts/handlers'  // Side-effect: registers handlers

export async function POST(request: Request) {
  // Validate, auth, rate limit, load history...

  return createUIMessageStream({
    execute: async ({ writer: ChatStream }) => {
      const titlePromise = generateTitle(firstMessage)

      const result = streamText({
        model: myProvider.languageModel(selectedModel),
        system: composeSystemPrompt({ settings, hasTools }),
        messages,
        tools: getEnabledTools(selectedModel) ? buildTools({ session, ChatStream, chatId }) : undefined,
        providerOptions: getProviderOptions(selectedModel, settings),
        experimental_transform: smoothStream({ delayInMs: 2, chunking: 'word' }),
        maxSteps: 5,
        abortSignal: request.signal,
      })

      result.consumeStream()
      ChatStream.merge(result.toUIMessageStream({ sendReasoning: true }))

      const title = await titlePromise
      ChatStream.writeData({ type: 'chat-title', content: title })
    },
    onFinish: async ({ messages }) => {
      await saveMessages(chatId, messages)
      await updateChatTitle(chatId, title)
      refreshChat(chatId)       // revalidateTag
      refreshChatList(userId)   // revalidateTag
    },
  })
}
```

### Client: useChatSession Hook

```typescript
// features/chat/hooks/use-chat-session.ts
const chatReturn = useChat({
  id: chatId,
  api: '/api/chat',
  initialMessages,
  experimental_throttle: adaptiveThrottle,
  generateId: () => generateUUID(),
  maxSteps: 5,

  onData: (data) => {
    for (const part of data) {
      if (part.type === 'chat-title') PendingChats.updateTitle(chatId, part.content)
      if (part.type.startsWith('artifact-')) ChatStreamDispatch.setChatStream([part])
    }
  },

  onFinish: () => {
    ChatStreamDispatch.setChatStream([])  // Clear between messages
  },

  onError: (error) => {
    toast.error(parseStreamError(error).message)
  },
})
```

---

## Import Boundary Rules

```
lib/ai/                    → CAN import from: lib/types/, external packages
                           → CANNOT import from: features/*, app/*, components/*

features/chat/lib/tools/   → CAN import from: lib/ai/, lib/types/, lib/data/, external packages
                           → CANNOT import from: features/artifacts/* (uses registry instead)

features/artifacts/handlers/ → CAN import from: lib/ai/, lib/types/, external packages
                             → CANNOT import from: features/chat/*, components/*

features/*/components/      → CAN import from: components/ui/, lib/*, own feature
                            → CANNOT import from: other features/*
```

**Enforcement:** `scripts/check-imports.mjs` (P0-T17) runs in P7-T09 verification.

---

## File Map

```
lib/ai/
  ├── registry.ts              # createProviderRegistry (conditional providers)
  ├── provider.ts              # myProvider (reasoning middleware wrapper)
  ├── models.ts                # listChatModels() with 'use cache'
  ├── prompts.ts               # composeSystemPrompt()
  ├── provider-options.ts      # getProviderOptions() per-provider config
  ├── artifact-handlers.ts     # Handler registry (register/get) — dependency inversion
  ├── tools.ts                 # getEnabledTools() model-based tool gating
  └── title.ts                 # generateTitle()

lib/types/
  ├── model.types.ts           # ModelMetadata, DEFAULT_CHAT_MODEL, etc.
  ├── artifact.types.ts        # UIArtifact, ArtifactKind
  ├── artifact-handler.types.ts # ArtifactHandler, ArtifactStreamWriter
  └── settings.types.ts        # UserSettings

features/chat/
  ├── lib/tools/
  │   ├── weather.ts           # getWeather (self-contained)
  │   ├── create-artifact.ts   # createArtifact (uses handler registry)
  │   ├── update-artifact.ts   # updateArtifact (uses handler registry)
  │   └── request-suggestions.ts
  ├── components/
  │   ├── chat-stream-provider.tsx  # Split context + RAF batching
  │   └── stream-bridge.tsx         # Thin bridge → processStreamDelta → artifactStore
  ├── hooks/
  │   └── use-chat-session.ts       # useChat config + callbacks
  └── lib/
      └── process-stream-deltas.ts  # Pure testable function

features/artifacts/
  ├── handlers/
  │   ├── index.ts             # Side-effect: registers all handlers
  │   ├── text-handler.ts      # streamText → artifact-textDelta (append)
  │   ├── code-handler.ts      # streamObject → artifact-codeDelta (replace)
  │   └── sheet-handler.ts     # streamObject → artifact-sheetDelta (replace)
  └── lib/
      └── artifact-store.ts    # useSyncExternalStore: getSnapshot, subscribe, setState, reset
```

---

## Required External Packages

Key external packages required by the editors and rendering components:

| Package(s) | Purpose | Used By |
|------------|---------|--------|
| `@tiptap/*` | Rich text editing | Text editor (P4-T07) |
| `@codemirror/*`, `@lezer/*` | Code editing + syntax parsing | Code editor (P4-T08) |
| `react-data-grid`, `papaparse` | Spreadsheet grid + CSV parsing | Sheet editor (P4-T09) |
| `pyodide` | Python execution in browser | Code editor console (P4-T08) |
| `shiki` or `react-syntax-highlighter` | Code syntax highlighting | Code blocks in messages (P3-T15) |
| `dompurify` | HTML sanitization | Text editor output (P4-T07) |
| `react-markdown`, `remark-gfm` | Markdown rendering + GFM support | Message display (P3-T15) |

---

## What Changed from Old Architecture

| Old Pattern | New Pattern | Source |
|-------------|-------------|--------|
| `createDocument` / `updateDocument` tools | `createArtifact` / `updateArtifact` | Redesign naming |
| Tools directly import handler implementations | Handler registry with dependency inversion | `lib/ai/artifact-handlers.ts` |
| `data-document-*` stream parts | `artifact-*` stream parts | Redesign naming |
| `data-usage` / credit prompting | Removed entirely | No credit logic |
| DataStreamProvider at layout level | ChatStreamProvider at page level (split context + RAF) | Redesign architecture |
| DataStreamHandler (business logic) | StreamBridge (thin ~20 lines) + `processStreamDelta()` (pure) | Redesign architecture |
| SWR `mutate("artifact")` for state | `useSyncExternalStore` → granular selectors | Redesign architecture |
| 5+ components re-render per delta | 1 component + selector-based subscribers | ~80% reduction |
| `window.dispatchEvent` for titles | `PendingChats.updateTitle()` single channel | Redesign architecture |
| `pollForTitle()` 3× setTimeout | Title awaited server-side before stream close | Redesign architecture |
| `middleware.ts` for proxy | `proxy.ts` at project root | Next.js 16 convention |
| `PATCH /api/vote` route | Server Action + `useOptimistic` + VoteResolver | Redesign architecture |
