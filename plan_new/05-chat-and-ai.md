# Chat And AI

The chat system combines server-fetched initial data, client-side AI SDK state, SSE streaming, typed custom data parts, model registry lookup, and feature-owned tools.

## Chat Lifecycle

```text
User opens /
  -> server generates chat UUID
  -> server resolves session and default model
  -> ChatStreamProvider wraps ChatShell and StreamBridge
  -> ChatShell creates ChatSessionContext

User sends first message
  -> MultimodalInput validates non-empty input or file attachment
  -> URL changes to /chat/{id} with history.replaceState
  -> PendingChatsProvider adds a pending sidebar row
  -> useChat sends POST /api/chat

Server streams response
  -> validates request with Zod
  -> resolves AppSession
  -> checks ownership and rate limits
  -> creates chat if needed
  -> starts title generation in parallel
  -> calls streamText with model, messages, tools, prompts, settings
  -> merges AI SDK UI message stream
  -> writes custom data parts for title and artifacts

Stream finishes
  -> user and assistant messages are persisted
  -> title is awaited and written as chat-title
  -> chat and chat list tags are refreshed
```

## Client Composition

`ChatShell` is intentionally thin. It receives server props and creates the context consumed by `ChatHeader`, `Messages`, `MultimodalInput`, and `ArtifactPanel`.

```tsx
<ChatSessionContext.Provider value={chatSession}>
  <div className="flex h-dvh min-w-0 flex-col bg-background">
    <ChatHeader />
    <Messages />
    <MultimodalInput />
  </div>
  {artifact.isVisible ? <ArtifactPanel /> : null}
</ChatSessionContext.Provider>
```

`useChatSession` owns `useChat` configuration, current model, attachments, settings reads, callbacks, and submit behavior. `useChatSideEffects` owns navigation cleanup, abort-on-unmount, query auto-send, and artifact reset on chat change.

## Streaming Pipeline

```text
DefaultChatTransport
  -> POST /api/chat
    -> createUIMessageStream
      -> streamText
        -> tool calls and UI message parts
        -> custom data parts
    -> JsonToSseTransformStream response
  -> useChat client stream handling
    -> messages update for text and reasoning
    -> onData handles custom data parts
      -> chat-title updates PendingChatsProvider
      -> artifact-* parts go to ChatStreamProvider
        -> StreamBridge
          -> processStreamDelta
            -> artifactStore.setState
```

## Custom Data Parts

| Part | Content | Consumer | Behavior |
|---|---|---|---|
| `chat-title` | `string` | Pending chats | Set sidebar title |
| `artifact-id` | `string` | Artifact store | Set ID, open panel, status streaming |
| `artifact-title` | `string` | Artifact store | Set title |
| `artifact-kind` | `text`, `code`, `sheet`, `image` | Artifact store | Set kind |
| `artifact-clear` | `''` | Artifact store | Clear content |
| `artifact-textDelta` | `string` | Artifact store | Append to content |
| `artifact-codeDelta` | `string` | Artifact store | Replace content |
| `artifact-sheetDelta` | `string` | Artifact store | Replace content |
| `artifact-imageDelta` | `string` | Artifact store | Replace content |
| `artifact-suggestion` | Suggestion object | Artifact store/editor | Accumulate suggestion |
| `artifact-finish` | `''` | Artifact store | Set status idle |

Removed stream parts are `data-usage` and `data-appendMessage`.

## ChatStreamProvider

`ChatStreamProvider` is page-scoped and uses split contexts. Components that write to the stream use the dispatch context and avoid re-rendering on every data part. `StreamBridge` reads state and processes new deltas. RequestAnimationFrame batching coalesces high-frequency data parts before React state updates.

```typescript
type ChatStreamState = { ChatStream: DataPart[] }
type ChatStreamDispatch = {
  setChatStream: (updater: DataPart[] | ((prev: DataPart[]) => DataPart[])) => void
}
```

## Model Provider Registry

`lib/ai/registry.ts` builds a provider registry from configured environment keys. Google is the default expected provider. OpenAI and OpenRouter are conditional. Vercel gateway and credit activation logic are not part of the app.

`lib/ai/provider.ts` exposes `myProvider`, the single entry point for model resolution. It wraps models that need reasoning extraction middleware.

```typescript
const model = myProvider.languageModel(selectedChatModel)
```

## Model Catalog

Models are represented by `ModelMetadata`.

```typescript
type ModelMetadata = {
  id: string
  name: string
  provider: string
  providerModelId: string
  modalities: {
    input: Array<'text' | 'image' | 'file'>
    output: Array<'text' | 'reasoning'>
  }
  contextWindow: number
  maxOutputTokens: number
  supportsToolCalling: boolean
  supportsReasoning: boolean
  source: 'static' | 'dynamic'
}
```

`getAvailableModels()` is server-side, cached with `cacheTag('models')`, and combines static curated models with discovered provider models. `getDefaultModel(session)` reads the `chat-model` cookie, validates the model, and falls back to `DEFAULT_CHAT_MODEL`.

Model selection is rendered in `ChatHeader`, grouped by provider, and persisted to both cookie and localStorage. Existing chats use their stored `chat.model` value.

## Tools

| Tool | Purpose | Parameters |
|---|---|---|
| `getWeather` | Fetch weather from Open-Meteo | `{ latitude, longitude }` or resolved coordinates |
| `createArtifact` | Create a text, code, or sheet artifact | `{ title, kind }` |
| `updateArtifact` | Rewrite an existing artifact | `{ id, description }` |
| `requestSuggestions` | Generate text artifact suggestions | `{ artifactId }` |

Tool availability is based on model capabilities. Models without function calling receive no active tools. Artifact tools resolve handlers through `getArtifactHandler(kind)` and never import artifact implementations directly.

## Prompt And Settings Inputs

The system prompt is composed from the base assistant identity, current date, optional user system prompt, artifact instructions when tools are active, and reasoning guidance when the selected model supports it or the user enables it.

Settings are not a provider. They are read from `useSettings()`:

```typescript
type SettingsState = {
  temperature: number
  topP: number
  maxOutputTokens: number
  systemPrompt: string
  enableReasoning: boolean
}
```

The request body sends settings with each chat request. Model selection is separate from settings.

## Reliability Rules

1. The server awaits title generation before stream close and sends one `chat-title` part.
2. The client does not poll for title updates and does not use window events.
3. Navigation away from a streaming chat aborts the active request and resets artifact state.
4. Partial assistant content should be saved when the stream abort path has content to preserve.
5. Errors before streaming use structured `AppError` responses. Stream errors surface through `useChat.onError` and user-facing toast or message footer UI.
