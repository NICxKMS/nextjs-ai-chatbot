# Streaming Architecture — SSE Flow, Data Parts & Stream Lifecycle

> Complete streaming architecture from client request through SSE delivery to UI update.
> Addresses: SEAM-006, SEAM-007, SEAM-008, SEAM-012, IV-7, V-5, VI-1, VI-2, VI-5, VII-3

---

## 1. SSE Streaming Flow

```
Client                                          Server
──────                                          ──────
MultimodalInput.sendMessage()
  │
  ▼
useChatSession.handleSubmit()
  │ prepareSendMessagesRequest:
  │   { id, message, selectedChatModel,
  │     selectedVisibilityType, settings }
  │
  ▼
DefaultChatTransport → POST /api/chat ────────► route.ts handler
                                                  │
                                                  ├── Zod validation
                                                  ├── getAppSession()
                                                  ├── Rate limit check
                                                  ├── Load chat history (if existing)
                                                  ├── Create chat (if new)
                                                  │
                                                  ▼
                                              createUIMessageStream({
                                                execute: ({ writer: ChatStream }) => {
                                                  │
                                                  ├── titlePromise = generateTitle(msg)
                                                  │
                                                  ├── streamText({
                                                  │     model, system, messages,
                                                  │     tools, providerOptions,
                                                  │     smoothStream, stopWhen,
                                                  │     abortSignal
                                                  │   })
                                                  │
                                                  ├── result.consumeStream()
                                                  ├── ChatStream.merge(
                                                  │     result.toUIMessageStream({
                                                  │       sendReasoning: true
                                                  │     })
                                                  │   )
                                                  │
                                                  ├── title = await titlePromise
                                                  ├── ChatStream.writeData({
                                                  │     type: 'chat-title',
                                                  │     content: title
                                                  │   })
                                                  │
                                                  └── (stream closes)
                                                },
                                                onFinish: async ({ messages }) => {
                                                  await saveMessages(chatId, messages)
                                                  await updateChatTitle(chatId, title)
                                                  refreshChat(chatId)
                                                  refreshChatList(userId)
                                                }
                                              })
                                                  │
SSE Response ◄─────────────────────────────────── │
  │                                          Response(stream.pipeThrough(
  ▼                                            new JsonToSseTransformStream()))
useChat processes SSE chunks
  │
  ├── text-delta → messages state update → Messages re-renders
  ├── reasoning → reasoning parts in message
  ├── tool-call → tool UI in message
  ├── tool-result → tool result UI
  ├── custom data parts → onData callback
  │     ├── chat-title → PendingChats.updateTitle()
  │     └── artifact-* → ChatStreamProvider.setChatStream()
  │
  ▼
StreamBridge (useEffect)
  │ reads ChatStream from ChatStreamProvider
  │ calls processStreamDelta(delta, currentArtifact)
  │ writes to artifactStore.setState()
  │
  ▼
ArtifactPanel re-renders (useSyncExternalStore subscription)
```

---

## 2. Data Stream Part Types

All custom data stream parts use **"artifact"** naming. No "document" prefix.

### Artifact Lifecycle Parts

| Part Type | Content | Direction | Purpose |
|-----------|---------|-----------|---------|
| `artifact-id` | `string` (UUID) | Server→Client | Set artifact document ID, transition to streaming |
| `artifact-title` | `string` | Server→Client | Set artifact title |
| `artifact-kind` | `ArtifactKind` | Server→Client | Set artifact kind (text/code/sheet) |
| `artifact-clear` | `''` | Server→Client | Clear content, signal new generation |
| `artifact-finish` | `''` | Server→Client | Mark generation complete, status → idle |

### Content Delta Parts

| Part Type | Content | Accumulation | Used By |
|-----------|---------|--------------|---------|
| `artifact-textDelta` | Text chunk | **Append** (`content += delta`) | Text handler (streamText) |
| `artifact-codeDelta` | Full code string | **Replace** (`content = delta`) | Code handler (streamObject) |
| `artifact-sheetDelta` | Full CSV string | **Replace** (`content = delta`) | Sheet handler (streamObject) |
| `artifact-imageDelta` | Base64 data URL | **Replace** (`content = delta`) | Image (from code execution) |

### Other Parts

| Part Type | Content | Purpose |
|-----------|---------|---------|
| `artifact-suggestion` | `{ originalText, suggestedText, description }` | Inline edit suggestion |
| `chat-title` | `string` | Chat title (AWAITED server-side) |

### TypeScript Definition

```typescript
// features/chat/types/chat.types.ts
export type ArtifactDataPart =
  | { type: 'artifact-id'; content: string }
  | { type: 'artifact-title'; content: string }
  | { type: 'artifact-kind'; content: ArtifactKind }
  | { type: 'artifact-clear'; content: string }
  | { type: 'artifact-finish'; content: string }
  | { type: 'artifact-textDelta'; content: string }
  | { type: 'artifact-codeDelta'; content: string }
  | { type: 'artifact-sheetDelta'; content: string }
  | { type: 'artifact-imageDelta'; content: string }
  | { type: 'artifact-suggestion'; content: ArtifactSuggestion }
  | { type: 'chat-title'; content: string }

export type DataPart = ArtifactDataPart

export interface ArtifactSuggestion {
  originalText: string
  suggestedText: string
  description: string
}
```

### Removed Parts (No Credit Logic)

| Removed | Reason |
|---------|--------|
| `data-usage` | Credit/quota system removed entirely |
| `data-appendMessage` | Not needed — useChat manages messages natively |

---

## 3. StreamBridge Pattern

### Architecture

```
ChatStreamProvider (split context)
  │
  ├── StateContext: { ChatStream: DataPart[] }
  │     └── consumed by StreamBridge (reads)
  │
  └── DispatchContext: { setChatStream: updater }
        └── consumed by useChatSession.onData (writes)
```

### ChatStreamProvider — Split Context with RAF Batching

```typescript
// features/chat/components/chat-stream-provider.tsx
'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { DataPart } from '@/features/chat/types/chat.types'

interface ChatStreamState { ChatStream: DataPart[] }
interface ChatStreamDispatch {
  setChatStream: (updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => void
}

const StateCtx = createContext<ChatStreamState | null>(null)
const DispatchCtx = createContext<ChatStreamDispatch | null>(null)

export function ChatStreamProvider({ children }: { children: React.ReactNode }) {
  const [ChatStream, setRaw] = useState<DataPart[]>([])
  const pendingRef = useRef<DataPart[]>([])
  const rafRef = useRef<number | null>(null)

  const setChatStream = useCallback(
    (updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => {
      if (typeof updater === 'function') { setRaw(updater); return }
      // Batch individual pushes via RAF
      pendingRef.current.push(...updater)
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          const batch = pendingRef.current
          pendingRef.current = []
          rafRef.current = null
          setRaw(prev => [...prev, ...batch])
        })
      }
    }, [],
  )

  return (
    <DispatchCtx.Provider value={{ setChatStream }}>
      <StateCtx.Provider value={{ ChatStream }}>
        {children}
      </StateCtx.Provider>
    </DispatchCtx.Provider>
  )
}

export function useChatStream() {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useChatStream requires ChatStreamProvider')
  return ctx
}

export function useChatStreamDispatch() {
  const ctx = useContext(DispatchCtx)
  if (!ctx) throw new Error('useChatStreamDispatch requires ChatStreamProvider')
  return ctx
}
```

**Benefits of split context:**
- `useChatSession.onData` uses `useChatStreamDispatch()` → **no re-render** on state change
- `StreamBridge` uses `useChatStream()` → re-renders on new deltas (necessary)
- RAF batching coalesces ~200 SSE deltas/sec to ~60 React updates/sec

**Fixes:** V-5 (high-frequency cascades), VI-1 (two-stage re-renders)

### StreamBridge — Thin Bridge Component

```typescript
// features/chat/components/stream-bridge.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useChatStream } from './chat-stream-provider'
import { processStreamDelta } from '@/features/chat/lib/process-stream-deltas'
import { artifactStore } from '@/features/artifacts/lib/artifact-store'

export function StreamBridge({ id }: { id: string }) {
  const { ChatStream } = useChatStream()
  const lastProcessedRef = useRef(-1)
  const chatIdRef = useRef(id)

  // Reset processing index on chat change
  useEffect(() => {
    chatIdRef.current = id
    lastProcessedRef.current = -1
  }, [id])

  useEffect(() => {
    if (!ChatStream.length) {
      lastProcessedRef.current = -1
      return
    }
    // Guard against stale data from previous chat
    if (chatIdRef.current !== id) return

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

**Fixes:** IV-7 (hidden controller → thin bridge + pure function)

### processStreamDelta — Pure Function (Testable)

```typescript
// features/chat/lib/process-stream-deltas.ts
import type { DataPart } from '@/features/chat/types/chat.types'
import type { UIArtifact, ArtifactKind } from '@/lib/types/artifact.types'

export function processStreamDelta(
  delta: DataPart,
  current: UIArtifact,
): { artifact: UIArtifact } {
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

**Testing:** Zero React overhead — input delta + current state → output state. Covers all 10 part types.

---

## 4. Artifact Store Integration

### How Stream Events Flow to UI

```
SSE delta arrives
  → useChat.onData callback
    → for artifact-* parts: dispatchCtx.setChatStream([...parts])
    → for chat-title: PendingChats.updateTitle()
  → RAF batches deltas
  → ChatStreamProvider state updates
  → StreamBridge effect fires
    → processStreamDelta() (pure)
    → artifactStore.setState()
  → useSyncExternalStore notifies subscribers
    → ArtifactPanel (reads content) → re-renders ✓ (necessary)
    → ArtifactCloseButton (reads isVisible via selector) → NO re-render
    → VersionFooter (reads artifactId via selector) → NO re-render
```

### Streaming Status Flow

| Event | `artifactStore.status` | UI Effect |
|-------|------------------------|-----------|
| `artifact-id` received | `'streaming'` | Panel opens, shows "Generating..." |
| Content deltas | `'streaming'` (unchanged) | Content renders progressively |
| `artifact-finish` | `'idle'` | Progress indicator removed |
| Chat ID change | Reset to initial | Panel closes, store cleared |

### Panel Open/Close Logic

| Trigger | Action |
|---------|--------|
| `artifact-id` data part | `isVisible: true` (via processStreamDelta) |
| Close button click | `artifactStore.setState({ isVisible: false })` |
| Click ArtifactPreview in message | `artifactStore.setState({ artifactId, isVisible: true })` |
| Navigate to different chat | `artifactStore.reset()` → `isVisible: false` |

---

## 5. Stream Lifecycle

### Start — User Sends Message

```
1. MultimodalInput → useChatSessionContext().sendMessage()
2. useChatSession internally:
   a. Validates input (non-empty, no active stream)
   b. If new chat: PendingChats.add({ id, title: input.slice(0, 50), ... })
   c. history.replaceState({}, '', `/chat/${chatId}`) — URL update (no navigation)
   d. Creates AbortController for this request
   e. Calls useChat.handleSubmit()
3. DefaultChatTransport.prepareSendMessagesRequest:
   { id: chatId, message: lastMessage, selectedChatModel, selectedVisibilityType, settings }
4. POST /api/chat fires → SSE connection opens
5. Status transitions: idle → submitted → streaming
```

### Active — SSE Chunks Flowing

```
Server-side streamText produces tokens:
  → smoothStream({ delayInMs: 2, chunking: 'word' }) transforms
  → toUIMessageStream({ sendReasoning: true }) wraps
  → SSE chunks delivered to client

Client receives via useChat EventSource:
  → text-delta: appended to current assistant message → Messages re-renders
  → reasoning: appended to reasoning parts array → MessageReasoning renders
  → tool-call: rendered as tool call UI in Message
  → custom data parts: routed to onData callback → ChatStreamProvider
```

### Tool Call — Artifact Creation/Update

```
Server: streamText encounters tool_call
  → AI SDK invokes tool.execute()
  → createArtifact tool:
      1. Generate UUID
      2. Write artifact-kind, artifact-id, artifact-title, artifact-clear
      3. Get handler via getArtifactHandler(kind) — from registry
      4. Handler streams content deltas (artifact-textDelta, etc.)
      5. Handler returns content string
      6. Save to DB via saveArtifactVersion()
      7. Write artifact-finish
      8. Return tool result to AI
  → AI continues responding with tool result context
  → Up to 5 steps (stepCountIs(5))
```

### Finish — Stream Completes

```
Server:
  1. Title generation awaited: title = await titlePromise
  2. Write chat-title data part (with fallback: input.slice(0, 80))
  3. Stream closes cleanly
  4. onFinish callback:
     a. saveMessages(chatId, messages) → DB insert
     b. updateChatTitle(chatId, title) → DB update
     c. refreshChat(chatId) — revalidateTag('chat:{chatId}', 'max')
     d. refreshChatList(userId) — revalidateTag('chats:{userId}', 'max')

Client:
  1. Status: streaming → idle (or ready)
  2. useChat.onFinish fires
  3. ChatStream cleared: setChatStream([]) — prevents memory growth
  4. Ready for next message
```

**Fixes:** VII-1 (revalidation after every mutation), VII-3 (title awaited, no polling)

### Abort — User Navigates Away

```
Client (useChatSession cleanup):
  1. useEffect cleanup detects chat ID change or unmount
  2. if (status === 'streaming') → chat.stop() — sends abort to useChat
  3. abortControllerRef.current?.abort() — cancels fetch
  4. artifactStore.reset() — synchronous, prevents stale state flash
  5. ChatStream cleared

Server:
  1. request.signal fires 'abort' event
  2. Abort handler saves partial assistant response:
     if (accumulatedContent.length > 0) await savePartialMessage(...)
  3. Stream terminates — server stops generating tokens

Next visit:
  4. Server-fetched data includes partial response (if saved)
  5. User can regenerate from partial state
```

**Fixes:** VI-5 (stream abort on navigation), VII-4 (partial save)

### Error — Stream Failure

```
Server error:
  1. AppError thrown → caught at handler boundary
  2. Error serialized in SSE stream as error event
  3. Stream closes with error

Client:
  1. useChat.onError fires
  2. Parse error: { code, message, status }
  3. Display toast with user-friendly message
  4. Status: streaming → error
  5. Messages show partial response (if any content arrived)
  6. User can retry (sendMessage again)

Error boundary:
  7. If component-level error: ArtifactErrorBoundary catches
  8. If route-level error: app/(chat)/error.tsx renders
  9. If catastrophic: app/global-error.tsx renders
```

---

## 6. AI SDK Integration Details

### useChat Configuration

```typescript
// features/chat/hooks/use-chat-session.ts
const chatReturn = useChat({
  id: chatId,
  api: '/api/chat',

  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ id, messages }) => ({
      id: chatId,
      message: messages.at(-1),            // Only latest message
      selectedChatModel: currentModelId,
      selectedVisibilityType: visibility,
      settings: settingsSnapshot,          // From useSettings()
    }),
  }),

  initialMessages,
  experimental_throttle: adaptiveThrottle, // 50/100/150ms by connection
  generateId: () => generateUUID(),
  maxSteps: 5,
  sendExtraMessageFields: true,

  onData: (data) => {
    for (const part of data) {
      if (part.type === 'chat-title') {
        PendingChats.updateTitle(chatId, part.content)
      }
      // Artifact parts are batch-written to ChatStreamProvider
      if (part.type.startsWith('artifact-')) {
        ChatStreamDispatch.setChatStream([part])
      }
    }
  },

  onFinish: () => {
    ChatStreamDispatch.setChatStream(prev => [])  // Clear between messages
  },

  onError: (error) => {
    const parsed = parseStreamError(error)
    toast.error(parsed.message)
  },
})
```

### Adaptive Throttle

```typescript
const adaptiveThrottle = (() => {
  if (typeof navigator === 'undefined') return 100
  const conn = (navigator as any).connection
  if (!conn) return 100
  const dl = conn.downlink
  if (dl >= 10) return 50     // Fast (≥10 Mbps)
  if (dl >= 1) return 100     // Medium
  return 150                   // Slow (<1 Mbps)
})()
```

### smoothStream Transform

```typescript
// Applied per-request in streamText config
experimental_transform: smoothStream({
  delayInMs: 2,       // 2ms between chunks — smooth character appearance
  chunking: 'word',   // Word-level chunking, not character
})
```

Purpose: Prevents "machine gun" effect of instant token dumps. Creates typewriter-like streaming UX. 2ms delay is imperceptible but smooths rendering.

---

## 7. Server-Side Route Handler

> Full route handler sketch is in [ai-integration.md](./ai-integration.md) §3–4.

Key points relevant to streaming:
- `createUIMessageStream` wraps the entire execute + onFinish lifecycle
- `result.consumeStream()` + `ChatStream.merge(result.toUIMessageStream())` pipes AI tokens into SSE
- Title is **awaited** inside execute before stream close (fixes VII-3)
- `onFinish` persists messages + revalidates cache tags
- `request.signal` abort handler saves partial responses
- Response: `stream.pipeThrough(new JsonToSseTransformStream())`

---

## 8. Summary: What Changed from Old Architecture

| Old Pattern | New Pattern | Finding |
|-------------|-------------|---------|
| `data-id`, `data-title`, etc. | `artifact-id`, `artifact-title`, etc. | VIII-1 |
| `data-usage` stream part | Removed | No credit logic |
| SWR `mutate("artifact")` for state | `artifactStore.setState()` via useSyncExternalStore | III-1, VI-1, VI-2 |
| ChatStreamProvider at layout level | Scoped to page level (inside chat page) | V-5, III-3 |
| 5+ components re-render per delta | 1 component + selector-based subscribers | VI-2, ~80% reduction |
| `window.dispatchEvent` for titles | `PendingChats.updateTitle()` via single channel | IV-2 |
| `pollForTitle()` 3× setTimeout | Title awaited server-side before stream close | VII-3 |
| No stream abort on navigation | AbortController + stop() + artifactStore.reset() | VI-5 |
| Business logic in StreamBridge | Pure `processStreamDelta()` + thin bridge | IV-7 |
| RAF batching absent | Split context + RAF coalesces to ~60 updates/sec | V-5 |
