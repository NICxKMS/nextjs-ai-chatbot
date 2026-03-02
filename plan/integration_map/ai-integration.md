> **Updated per redesign audit (2026-03-01)**

# AI Integration

> Complete documentation of AI SDK usage, StreamBridge event processing,
> tool execution flow, artifact creation from AI, system prompt composition,
> provider/model resolution, and streaming protocol.
> Updated to reflect: createArtifact/updateArtifact tools, handler registry,
> ChatStreamProvider/StreamBridge, artifact-* stream part naming,
> composeSystemPrompt(), processStreamDelta() pure function, no credit/usage tracking.

---

## 1. useChat Configuration

The `useChat` hook from `@ai-sdk/react` is configured in the `useChatSession` hook,
called within the `ChatShell` component.

### Hook Setup

```typescript
// features/chat/hooks/use-chat-session.ts (inside ChatShell)
const chatReturn = useChat({
  id: chatId,
  api: "/api/chat",

  transport: new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      id: chatId,
      message: messages.at(-1),              // Only the latest message
      selectedChatModel: currentModelId,
      selectedVisibilityType: visibility,
      settings: settingsSnapshot,           // From useSettings() module store
    }),
  }),

  initialMessages,
  experimental_throttle: adaptiveThrottle,  // 50/100/150ms by connection speed
  generateId: () => generateUUID(),
  maxSteps: 5,
  sendExtraMessageFields: true,

  onData: (data) => {
    for (const part of data) {
      if (part.type === "chat-title") {
        pendingChats.updateTitle(chatId, part.content);
      }
      // Artifact parts routed to ChatStreamProvider
      if (part.type.startsWith("artifact-")) {
        chatStreamDispatch.setChatStream([part]);
      }
    }
  },

  onFinish: () => {
    chatStreamDispatch.setChatStream(prev => []);  // Clear between messages
  },

  onError: (error) => {
    const parsed = parseStreamError(error);
    toast.error(parsed.message);
  },
});
```

### Adaptive Throttle

```typescript
const adaptiveThrottle = (() => {
  if (typeof navigator === 'undefined') return 100;
  const conn = (navigator as any).connection;
  if (!conn) return 100;
  const dl = conn.downlink;
  if (dl >= 10) return 50;    // Fast (≥10 Mbps)
  if (dl >= 1) return 100;    // Medium
  return 150;                  // Slow (<1 Mbps)
})();
```

### Key Behavior Notes

- **Only latest message sent**: `prepareSendMessagesRequest` sends only the last message,
  not full history. Server loads history from DB/cache.
- **URL update**: On first message, `history.replaceState` updates URL to `/chat/{chatId}`.
- **Optimistic sidebar**: On first message, `PendingChats.add()` creates sidebar entry.
- **onData routing**: `chat-title` → PendingChats, `artifact-*` → ChatStreamProvider.
- **onFinish cleanup**: ChatStream cleared to prevent memory growth.

---

## 2. StreamBridge — Thin Bridge Pattern

`StreamBridge` is a client component (~20 lines) that renders `null`. It connects
`ChatStreamProvider` state to `artifactStore` via a **pure function**.

### Architecture

```
SSE Stream → useChat.onData → ChatStreamProvider (DispatchCtx)
                                    ↓ (RAF batched)
                              ChatStreamProvider (StateCtx)
                                    ↓
                              StreamBridge (useEffect)
                                    ↓
                              processStreamDelta() (PURE FUNCTION)
                                    ↓
                              artifactStore.setState() (useSyncExternalStore)
                                    ↓
                              Subscriber components re-render (selector-based)
```

### StreamBridge Component (~20 lines)

```typescript
'use client'
import { useChatStream } from '@/features/chat/hooks/use-data-stream'
import { processStreamDelta } from '@/features/chat/lib/process-stream-deltas'
import { artifactStore } from '@/features/artifacts/lib/artifact-store'

export function StreamBridge({ id }: { id: string }) {
  const { ChatStream } = useChatStream()

  useEffect(() => {
    if (!ChatStream.length) return
    const latest = ChatStream[ChatStream.length - 1]
    const current = artifactStore.getSnapshot()
    const { artifact } = processStreamDelta(latest, current)
    artifactStore.setState(artifact)
  }, [ChatStream])

  return null
}
```

### processStreamDelta — Pure Function (Testable)

```typescript
export function processStreamDelta(
  delta: DataPart,
  current: UIArtifact
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
    case 'artifact-suggestion':
      return { artifact: { ...current, suggestions: [...(current.suggestions ?? []), delta.content] } }
    default:
      return { artifact: current }
  }
}
```

### Cross-Feature Import

`StreamBridge` (in `features/chat/`) imports `artifactStore` from `features/artifacts/lib/artifact-store.ts`.
This is the **one intentional exception** to "no cross-feature implementation imports."
The store is a module-level object with a stable API — it's the declared public API of
the artifacts feature for state updates. Import is ONE-directional: chat → artifacts store.

---

## 3. Tool Execution Flow

### Tool Registration (Server-Side)

```
POST /api/chat → route handler
  │
  ├── import '@/features/artifacts/handlers'   // Side-effect: registers all handlers
  │
  ├── Tools registered with streamText():
  │     tools: getEnabledTools(modelId, { session, ChatStream, chatId })
  │       → {
  │           getWeather,                          // Static tool definition
  │           createArtifact({ session, ChatStream, chatId }),  // Factory
  │           updateArtifact({ session, ChatStream }),          // Factory
  │           requestSuggestions({ session, ChatStream }),      // Factory
  │         }
  │
  ├── Tool enablement based on model capabilities:
  │     → supportsToolCalling: false → NO tools (reasoning-only, gemma)
  │     → supportsToolCalling: true → ALL 4 tools
  │
  └── maxSteps: 5 (max tool call round-trips)
```

### Tool Execution Lifecycle

```
1. AI model returns tool_call in stream
2. AI SDK invokes tool.execute()
3. Tool writes artifact-* data parts to ChatStream
4. Tool may invoke AI generation (streamText/streamObject) for content
5. Tool persists result (saveArtifactVersion)
6. Tool returns structured result string
7. AI SDK includes tool_result in next step
8. AI model continues with tool result context
```

### getWeather Tool

```
Input: { latitude, longitude } OR { city }
  → Geocoding API → forecast API
  → Return: { temperature, hourlyForecast[], sunrise, sunset }
```

### createArtifact Tool

```
Input: { title: string, kind: "text"|"code"|"sheet" }
  │
  ├── id = generateUUID()
  ├── Stream metadata: artifact-kind → artifact-id → artifact-title → artifact-clear
  │
  ├── Handler via registry: getArtifactHandler(kind)
  │     ├── TEXT: streamText({ model: ARTIFACT_MODEL }) → artifact-textDelta (append)
  │     ├── CODE: streamObject({ schema: { code: string } }) → artifact-codeDelta (replace)
  │     └── SHEET: streamObject({ schema: { csv: string } }) → artifact-sheetDelta (replace)
  │
  ├── saveArtifactVersion({ id, title, kind, content, userId, chatId })
  ├── Stream: artifact-finish
  └── Return: { id, title, kind, content: "An artifact was created..." }
```

### updateArtifact Tool

```
Input: { id: string, description: string }
  │
  ├── getArtifactById(id) → existing artifact (latest version)
  ├── Stream: artifact-clear
  │
  ├── handler.update({ id, description, currentContent, kind, title, ChatStream, session })
  │     ├── Same per-kind streaming as create
  │     └── Uses existing content + description as AI context
  │
  ├── saveArtifactVersion() → new version row (same id, new createdAt)
  ├── Stream: artifact-finish
  └── Return: { id, title, kind, content: "The artifact has been updated..." }
```

### requestSuggestions Tool

```
Input: { artifactId: string }
  │
  ├── getArtifactById(artifactId) → latest version content
  ├── streamObject({ schema: suggestions[5], prompt: content })
  ├── For each: ChatStream.writeData({ type: 'artifact-suggestion', content: suggestion })
  ├── Auth users: saveSuggestions() → DB
  └── Return: { id, message: "Suggestions have been added..." }
```

---

## 4. System Prompt Composition

### composeSystemPrompt() (lib/ai/prompts.ts)

```typescript
export function composeSystemPrompt({
  settings,
  hasTools,
}: {
  settings: UserSettings
  hasTools: boolean
}): string {
  const parts: string[] = [BASE_PROMPT]

  // User custom system prompt (if set)
  if (settings.systemPrompt?.trim()) {
    parts.push(settings.systemPrompt.trim())
  }

  // Artifact instructions (only when tools available)
  if (hasTools) {
    parts.push(ARTIFACTS_PROMPT)
  }

  // Reasoning hint (when enabled + model supports it)
  if (settings.enableReasoning) {
    parts.push(REASONING_PROMPT)
  }

  return parts.join('\n\n')
}
```

### Prompt Components

| Prompt | Source | Content |
|--------|--------|---------|
| `BASE_PROMPT` | `lib/ai/prompts.ts` | "You are a helpful assistant. Today's date is {date}." |
| `settings.systemPrompt` | User settings (localStorage → request body) | User-defined custom instructions |
| `ARTIFACTS_PROMPT` | `lib/ai/prompts.ts` | Instructions for createArtifact/updateArtifact usage (>10 lines threshold, kinds, etc.) |
| `REASONING_PROMPT` | `lib/ai/prompts.ts` | "Think step-by-step before responding." |

### Artifact Prompt Details

The artifacts prompt instructs the AI when to use `createArtifact`:
- Content > 10 lines (text, code, data)
- Self-contained and referenceable
- Iteratively editable
- Artifact kinds: "text" (markdown), "code" (Python), "sheet" (CSV)
- Uses `updateArtifact` for modifications with description

> **Removed:** Credit/token usage warnings, gateway routing instructions, "document" references.

---

## 5. Provider/Model Resolution

### Provider Registry

```
lib/ai/registry.ts → createProviderRegistry(baseProviders)
  │
  ├── Conditionally initialized based on env vars:
  │     ├── openai: OPENAI_API_KEY
  │     ├── google: GEMINI_API_KEY
  │     ├── openrouter: OPENROUTER_API_KEY
  │     └── (others based on available keys)
  │
  └── Models resolved as: "provider:model-name" → registry.languageModel("provider:model-name")
```

### myProvider Wrapper (lib/ai/provider.ts)

```typescript
export const myProvider = {
  languageModel(modelId: string) {
    const model = registry.languageModel(modelId);

    // Wrap reasoning models with middleware
    const metadata = getModelById(modelId);
    if (metadata?.supportsReasoning) {
      return wrapLanguageModel(model,
        extractReasoningMiddleware({ tagName: getReasoningTagName(modelId) })
      );
    }

    return model;
  }
};
```

### Per-Provider Options (lib/ai/provider-options.ts)

```typescript
export function getProviderOptions(modelId: string, settings: UserSettings) {
  const opts: Record<string, unknown> = {}
  if (settings.enableReasoning) {
    if (modelId.startsWith('google:'))
      opts.providerOptions = { google: { thinkingConfig: { thinkingBudget: 1024 } } }
    if (modelId.startsWith('openai:'))
      opts.providerOptions = { openai: { reasoningEffort: 'medium' } }
  }
  return opts
}
```

### Model Catalog

```
getAvailableModels() — 'use cache' + cacheTag('models') + cacheLife('hours')
  → STATIC_MODELS (hardcoded curated list)
  + discoverModels() (OpenRouter API, if configured)
  → Merged, deduplicated, sorted by name
  → Default chat model: google:gemma-3-4b-it
  → Artifact model: google:gemini-2.5-flash-lite
```

---

## 6. Streaming Protocol Details

### Server-Side Stream Construction

```typescript
// POST /api/chat route handler
import '@/features/artifacts/handlers'  // Side-effect: register handlers

const stream = createUIMessageStream({
  execute: async ({ writer: ChatStream }) => {
    // Title generation (parallel)
    const titlePromise = generateTitle(userMessage.content)

    // Chat completion
    const result = streamText({
      model: myProvider.languageModel(modelId),
      system: composeSystemPrompt({ settings, hasTools }),
      messages: convertToModelMessages(uiMessages),
      tools: getEnabledTools(modelId, { session, ChatStream, chatId }),
      stopWhen: stepCountIs(5),
      abortSignal: AbortSignal.timeout(55_000),
      experimental_transform: smoothStream({ delayInMs: 2, chunking: "word" }),
      temperature, topP, maxOutputTokens,
      providerOptions: getProviderOptions(modelId, settings),
    })

    result.consumeStream()
    ChatStream.merge(result.toUIMessageStream({ sendReasoning: true }))

    // AWAIT title before stream close — guaranteed delivery
    const title = await titlePromise
    ChatStream.writeData({
      type: 'chat-title',
      content: title ?? userMessage.content.slice(0, 80),
    })
  },

  onFinish: async ({ messages }) => {
    await saveMessages(chatId, messages)
    await updateChatTitle(chatId, title)
    refreshChat(chatId)       // revalidateTag('chat:{chatId}', 'max')
    refreshChatList(userId)   // revalidateTag('chats:{userId}', 'max')
  },
})

return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
```

### smoothStream Transform

```typescript
experimental_transform: smoothStream({
  delayInMs: 2,         // 2ms between chunks — typewriter effect
  chunking: "word",     // Word-level chunking (not character)
})
```

### Stream Lifecycle

```
1. Client POST /api/chat
2. Server creates UIMessageStream
3. Title generation starts (async, parallel)
4. streamText() begins → tokens flow
5. Tool calls may interrupt → execute tool → resume
6. Title AWAITED before stream close → chat-title written
7. Stream closes
8. onFinish → messages saved, cache tags revalidated
9. Client: status → idle, onFinish cleanup fires
```

### Abort Handling

```
Client navigates away during stream:
  1. useChatSession cleanup: stop() if streaming
  2. abortControllerRef.current?.abort() → cancels fetch
  3. artifactStore.reset() → synchronous, prevents stale state flash
  4. ChatStream cleared

Server-side:
  1. request.signal fires 'abort' event
  2. Abort handler saves partial response if content accumulated
  3. revalidateTag still fires if onFinish reached
```

---

## 7. Handler Registry Pattern

### Registry (lib/ai/artifact-handlers.ts)

```typescript
const handlers = new Map<ArtifactKind, ArtifactHandler>()

export function registerArtifactHandler(kind: ArtifactKind, handler: ArtifactHandler) {
  handlers.set(kind, handler)
}

export function getArtifactHandler(kind: ArtifactKind): ArtifactHandler {
  const handler = handlers.get(kind)
  if (!handler) throw new Error(`No handler for kind: ${kind}`)
  return handler
}
```

### Registration (features/artifacts/handlers/index.ts)

```typescript
// Side-effect: registers all handlers when imported
import { registerArtifactHandler } from '@/lib/ai/artifact-handlers'
import { textHandler } from './text-handler'
import { codeHandler } from './code-handler'
import { sheetHandler } from './sheet-handler'

registerArtifactHandler('text', textHandler)
registerArtifactHandler('code', codeHandler)
registerArtifactHandler('sheet', sheetHandler)
```

### Registration Timing

Route handler imports `'@/features/artifacts/handlers'` (side-effect) before processing.
ES module imports execute before module body — no race condition.

### Dependency Inversion

```
features/chat/lib/tools/create-artifact.ts
  → imports getArtifactHandler from lib/ai/artifact-handlers.ts (registry)
  → does NOT import features/artifacts/handlers/ directly
  → handler implementation injected via registration
```

This breaks the direct chat→artifacts dependency. The registry sits in `lib/ai/` (shared infrastructure), both features can interact through it without importing each other's implementations.

---

## 8. File Map

```
lib/ai/
  ├── registry.ts              # createProviderRegistry (conditional providers)
  ├── provider.ts              # myProvider (reasoning middleware wrapper)
  ├── models.ts                # getAvailableModels() with 'use cache'
  ├── prompts.ts               # composeSystemPrompt()
  ├── provider-options.ts      # getProviderOptions() per-provider config
  ├── artifact-handlers.ts     # Handler registry (register/get)
  ├── tools.ts                 # getEnabledTools() model-based tool gating
  └── title.ts                 # generateTitle()

lib/types/
  ├── model.types.ts           # ModelMetadata, DEFAULT_CHAT_MODEL
  ├── artifact.types.ts        # UIArtifact, ArtifactKind
  ├── artifact-handler.types.ts # ArtifactHandler, ArtifactStreamWriter
  └── settings.types.ts        # SettingsState

features/chat/lib/tools/
  ├── weather.ts               # getWeather (self-contained)
  ├── create-artifact.ts       # createArtifact (uses handler registry)
  ├── update-artifact.ts       # updateArtifact (uses handler registry)
  └── request-suggestions.ts   # requestSuggestions

features/artifacts/handlers/
  ├── index.ts                 # Side-effect: registers all handlers
  ├── text-handler.ts          # streamText → artifact-textDelta (append)
  ├── code-handler.ts          # streamObject → artifact-codeDelta (replace)
  └── sheet-handler.ts         # streamObject → artifact-sheetDelta (replace)
```

---

## 9. Summary: What Changed from Old Architecture

| Old Pattern | New Pattern | Reason |
|-------------|-------------|--------|
| `createDocument` / `updateDocument` tools | `createArtifact` / `updateArtifact` | Artifact naming consistency |
| `data-id`, `data-title`, etc. stream parts | `artifact-id`, `artifact-title`, etc. | Domain-prefixed naming |
| `data-usage` stream part | Removed | No credit/quota system |
| Tools directly import handler implementations | Handler registry (`lib/ai/artifact-handlers.ts`) with dependency inversion | Breaks cross-feature coupling |
| `DataStreamHandler` processes deltas (complex) | `StreamBridge` (~20 lines) + pure `processStreamDelta()` | Testable, minimal |
| SWR `mutate("artifact")` for state | `artifactStore.setState()` via useSyncExternalStore | ~80% fewer re-renders |
| `DataStreamProvider` at layout level | `ChatStreamProvider` at page level | Prevents sidebar cascade |
| Monolithic system prompt | `composeSystemPrompt()` with conditional composition | Modular, settings-driven |
| `middleware.ts` for proxy | `proxy.ts` at project root | Next.js 16 convention |
| `pollForTitle()` 5×500ms + window events | Title AWAITED server-side, single `chat-title` stream part | Reliable, no polling |
| Hardcoded model list | `getAvailableModels()` with `use cache` + dynamic discovery | Auto-refresh |
